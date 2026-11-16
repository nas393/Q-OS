/* AngolaIQ AI layer: server-side only, JSON output, Groq first then Gemini. Keys never leave the server. */
const GROQ_MODEL=process.env.GROQ_MODEL??"openai/gpt-oss-120b";
const GEMINI_MODEL=process.env.GEMINI_MODEL??"gemini-3.6-flash";

export const IQ_RULES=[
 "You are the analysis engine of AngolaIQ, a private commercial intelligence workspace for a senior FMCG commercial director in Luanda, Angola.",
 "Truth rules: never invent statistics, companies, laws, URLs or citations. Use only the EVIDENCE given plus well-established general knowledge.",
 "Label everything: put sourced facts in 'facts', your reasoning in 'inferences', and anything unproven in 'assumptions'. If evidence is thin, say so in 'limitations' and lower 'confidence'.",
 "Confidence is one of: high, medium, low. Write in clear, short business English. Return ONLY valid JSON matching the requested shape."
].join(" ");

export type AIResult<T>={data:T;provider:string;model:string;generatedAt:string};

async function groq(system:string,user:string){
 const key=process.env.GROQ_API_KEY;if(!key)return null;
 const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(55000),
  body:JSON.stringify({model:GROQ_MODEL,messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens:4000,temperature:0.4,response_format:{type:"json_object"}})});
 if(!r.ok)throw new Error(`Groq ${r.status}`);
 const j=await r.json() as {choices?:Array<{message?:{content?:string}}>};
 return {text:j.choices?.[0]?.message?.content??"",provider:"groq",model:GROQ_MODEL};
}
async function gemini(system:string,user:string){
 const key=process.env.GEMINI_API_KEY;if(!key)return null;
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},signal:AbortSignal.timeout(55000),
  body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig:{maxOutputTokens:4000,temperature:0.4,responseMimeType:"application/json"}})});
 if(!r.ok)throw new Error(`Gemini ${r.status}`);
 const j=await r.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
 return {text:j.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("")??"",provider:"gemini",model:GEMINI_MODEL};
}

/* Ask for JSON; parse defensively. Throws a readable error when no provider works. */
export async function generateJSON<T=Record<string,unknown>>(task:string,shape:string,evidence:string):Promise<AIResult<T>>{
 const system=`${IQ_RULES}\nTASK: ${task}\nJSON SHAPE: ${shape}`;
 const user=`EVIDENCE (from the platform's stored records; may be empty):\n${evidence.slice(0,14000)||"(none)"}`;
 const errors:string[]=[];
 for(const call of [groq,gemini]){
  try{
   const out=await call(system,user);if(!out)continue;
   const t=out.text.trim(),a=t.indexOf("{"),b=t.lastIndexOf("}");
   const data=JSON.parse(t.slice(a,b+1)) as T;
   return {data,provider:out.provider,model:out.model,generatedAt:new Date().toISOString()};
  }catch(e){errors.push(e instanceof Error?e.message:"failed");}
 }
 throw new Error(errors.length?`AI unavailable (${errors.join("; ")})`:"AI is not configured (add GROQ_API_KEY or GEMINI_API_KEY).");
}
