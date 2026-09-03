import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SuggestRequest {
  description?: string;
  photoData?: string | null;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Pothole: ["pothole", "road", "crack", "asphalt", "ditch", "speed bump", "manhole"],
  Streetlight: ["streetlight", "street light", "lamp", "light", "dark", "flicker", "pole"],
  Garbage: ["garbage", "trash", "waste", "rubbish", "dump", "bin", "litter", "smell"],
  Water: ["water", "leak", "pipe", "drainage", "flood", "sewage", "tap", "sewer"],
  Electricity: ["electric", "power", "wire", "transformer", "outage", "voltage", "meter"],
  Parking: ["parking", "vehicle", "car", "tow", "no parking", "illegal"],
  Trees: ["tree", "branch", "fallen", "garden", "park", "trim", "uprooted"],
  Noise: ["noise", "loud", "music", "construction", "honk", "party"],
  Animals: ["dog", "stray", "animal", "cattle", "monkey", "pest"],
  Sanitation: ["toilet", "urinal", "sanitation", "hygiene", "public toilet"],
};

const PRIORITY_KEYWORDS: { keywords: string[]; priority: string }[] = [
  { keywords: ["urgent", "emergency", "danger", "accident", "fire", "collapse", "electrocution", "flood", "injury"], priority: "urgent" },
  { keywords: ["broken", "damaged", "leak", "large", "major", "blocking", "severe", "heavy"], priority: "high" },
  { keywords: ["minor", "small", "slight", "occasionally", "sometimes"], priority: "low" },
];

function suggestCategory(description: string): string {
  const lower = description.toLowerCase();
  let best = "Other";
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

function suggestPriority(description: string): string {
  const lower = description.toLowerCase();
  for (const { keywords, priority } of PRIORITY_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return priority;
    }
  }
  return "medium";
}

function isCategory(value: unknown): value is string {
  return typeof value === "string" && [...Object.keys(CATEGORY_KEYWORDS), "Other"].includes(value);
}

function isPriority(value: unknown): value is string {
  return typeof value === "string" && ["low", "medium", "high", "urgent"].includes(value);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseModelResult(content: string): Record<string, unknown> {
  const normalized = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  const parsed = JSON.parse(normalized) as Record<string, unknown>;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function photoPart(photoData: string) {
  const match = photoData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("The uploaded image could not be prepared for Gemini");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", nullable: true },
    description: { type: "STRING", nullable: true },
    category: { type: "STRING" },
    priority: { type: "STRING" },
    location: { type: "STRING", nullable: true },
    ward: { type: "STRING", nullable: true },
    reason: { type: "STRING", nullable: true },
    recommendedAction: { type: "STRING", nullable: true },
  },
  required: ["title", "description", "category", "priority", "location", "ward", "reason", "recommendedAction"],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { description = "", photoData = null } = (await req.json()) as SuggestRequest;
    if (!description && !photoData) {
      return jsonResponse({ error: "Description or photo is required" }, 400);
    }

    let result: Record<string, string | null> = {
      category: suggestCategory(description),
      priority: suggestPriority(description),
      title: null,
      description: null,
      location: null,
      ward: null,
    };

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey || geminiApiKey === "your_gemini_api_key") {
      return jsonResponse({ error: "AI is not configured. Add GEMINI_API_KEY to the Supabase function secrets." }, 503);
    }

    // Gemini has retired gemini-2.5-flash for new API keys. Pin the currently
    // available Flash model instead of relying on a stale GEMINI_MODEL secret.
    const model = "gemini-3.6-flash";
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            {
              text: `Analyze this civic issue${photoData ? " photo" : " description"}${description ? ` and the user's note: ${description}` : ""}. Use category from ${Object.keys(CATEGORY_KEYWORDS).join(", ")} or Other. Use priority low, medium, high, or urgent. Write a concise title and useful description. Explain the classification briefly in reason and suggest one practical municipal action. Set location or ward to null unless clearly readable. Do not invent facts.`,
            },
            ...(photoData ? [photoPart(photoData)] : []),
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });
    if (!aiResponse.ok) {
      const failure = await aiResponse.json().catch(() => null) as GeminiResponse | null;
      const message = failure?.error?.message || `Gemini request failed (${aiResponse.status})`;
      return jsonResponse({ error: message }, 502);
    }

    const payload = await aiResponse.json() as GeminiResponse;
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!content) {
      return jsonResponse({ error: "Gemini returned an empty suggestion" }, 502);
    }

    const aiResult = parseModelResult(content);
    result = {
      ...result,
      ...aiResult,
      category: isCategory(aiResult.category) ? aiResult.category : result.category,
      priority: isPriority(aiResult.priority) ? aiResult.priority : result.priority,
    };

    if (description && !result.description) result.description = description;

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
