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


function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers:{
        ...corsHeaders,
        "Content-Type":"application/json"
      }
    }
  );

}


function parseJSON(text:string){

  const cleaned = text
    .replace(/```json/g,"")
    .replace(/```/g,"")
    .trim();


  try{
    return JSON.parse(cleaned);
  }
  catch{
    return {};
  }

}



Deno.serve(async(req)=>{

  if(req.method==="OPTIONS"){

    return new Response(null,{
      status:200,
      headers:corsHeaders
    });

  }


  try{


    const {
      description="",
      photoData=null
    } = await req.json() as SuggestRequest;



    if(!description && !photoData){

      return jsonResponse(
        {
          error:"Description or photo required"
        },
        400
      );

    }



    let result:any={

      title:null,
      description:null,
      category:suggestCategory(description),
      priority:suggestPriority(description),
      location:null,
      ward:null,
      reason:null,
      recommendedAction:null

    };



    const geminiKey =
      Deno.env.get("GEMINI_API_KEY");



    if(!geminiKey){

      return jsonResponse(
        {
          error:
          "AI not configured. Add GEMINI_API_KEY in Supabase secrets."
        },
        503
      );

    }



    const parts:any[]=[

      {

        text:`

Analyze this civic issue.

${description ? "Citizen note: "+description : ""}


Return ONLY JSON.

Keys:

title,
description,
category,
priority,
location,
ward,
reason,
recommendedAction


Category:

${Object.keys(CATEGORY_KEYWORDS).join(", ")}, Other


Priority:

low, medium, high, urgent


Rules:

- Do not invent location.
- Keep title short.
- Explain reason.
- Give one municipal action.

`

      }

    ];



    if(photoData){

      parts.push({

        inlineData:{

          mimeType:"image/jpeg",

          data:
          photoData.replace(
            /^data:image\/\w+;base64,/,
            ""
          )

        }

      });

    }



    const aiResponse = await fetch(

      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${geminiKey}`,

      {

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          contents:[
            {
              parts
            }
          ]

        })

      }

    );



    if(!aiResponse.ok){

      const error =
        await aiResponse.text();


      return jsonResponse(
        {
          error:error
        },
        502
      );

    }



    const payload =
      await aiResponse.json();



    const content =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text;



    if(!content){

      return jsonResponse(
        {
          error:"Gemini returned empty response"
        },
        502
      );

    }



    const aiResult =
      parseJSON(content);



    result={

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