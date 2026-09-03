import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
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
  Pothole: ["pothole", "road", "crack", "asphalt", "ditch", "manhole"],
  Streetlight: ["streetlight", "lamp", "light", "dark", "flicker", "pole"],
  Garbage: ["garbage", "trash", "waste", "dump", "bin", "litter"],
  Water: ["water", "leak", "pipe", "drainage", "flood", "sewage"],
  Electricity: ["electric", "power", "wire", "transformer", "outage"],
  Parking: ["parking", "vehicle", "car", "illegal"],
  Trees: ["tree", "branch", "fallen", "park", "trim"],
  Noise: ["noise", "loud", "music", "construction"],
  Animals: ["dog", "stray", "animal", "cattle"],
  Sanitation: ["toilet", "sanitation", "hygiene"],
};

const PRIORITY_KEYWORDS = [
  {
    keywords: ["urgent", "danger", "fire", "accident", "collapse", "flood", "injury"],
    priority: "urgent",
  },
  {
    keywords: ["broken", "damaged", "leak", "major", "blocking", "severe"],
    priority: "high",
  },
  {
    keywords: ["minor", "small", "slight"],
    priority: "low",
  },
];


function suggestCategory(description: string) {
  const lower = description.toLowerCase();

  let best = "Other";
  let score = 0;

  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {

    let count = 0;

    for (const word of words) {
      if (lower.includes(word)) count++;
    }

    if (count > score) {
      score = count;
      best = category;
    }
  }

  return best;
}


function suggestPriority(description: string) {

  const lower = description.toLowerCase();

  for (const item of PRIORITY_KEYWORDS) {

    for (const word of item.keywords) {

      if (lower.includes(word)) {
        return item.priority;
      }

    }

  }

  return "medium";
}


function isCategory(value: unknown) {

  return (
    typeof value === "string" &&
    [...Object.keys(CATEGORY_KEYWORDS), "Other"].includes(value)
  );

}


function isPriority(value: unknown) {

  return (
    typeof value === "string" &&
    ["low", "medium", "high", "urgent"].includes(value)
  );

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

    // gemini-2.5-flash is a stable multimodal model. Pin it instead of reading a
    // stale GEMINI_MODEL secret such as the invalid `gemini-3-flash` identifier.
    const model = "gemini-2.5-flash";
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


      category:
      isCategory(aiResult.category)
      ?
      aiResult.category
      :
      result.category,


      priority:
      isPriority(aiResult.priority)
      ?
      aiResult.priority
      :
      result.priority

    };



    if(description && !result.description){

      result.description=description;

    }



    return jsonResponse(result);



  }
  catch(error){

    return jsonResponse(
      {
        error:
        error instanceof Error
        ?
        error.message
        :
        "Internal server error"
      },
      500
    );

  }


});