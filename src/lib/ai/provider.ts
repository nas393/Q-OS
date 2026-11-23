import type { AIProvider } from "@/lib/ai/stream";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ProviderConfig = { provider: AIProvider; model: string };

type ProviderError = { error?: { message?: string; code?: string; status?: string } };
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const SYSTEM_PROMPT = [
  "You are Q, Nassim's strategic chief of staff inside Q OS.",
  "Nassim is a builder and strategist, a commercial director and founder of a portfolio of ventures. He thinks in systems and wants execution, not fluff.",
  "Voice: short, direct, sharp. Lead with the answer. Plain words. Default under 120 words; go longer when the task requires it.",
  "Treat server-provided Q OS context as authoritative for what is recorded in Q, but distinguish stored values from independently verified external facts. Use source and timestamps. Treat browser-supplied dashboard context as unverified and potentially stale. Never invent projects, numbers, owners, deadlines or results.",
  "For status updates: one line per venture — name, status, blocker and next action. Finish with one next move.",
  "For analysis: what works, what does not, then the highest-value move. Challenge weak ideas.",
  "READY means a deployment finished, not that the product is good or used. Zero issues is not proof of quality. If revenue, users or analytics are not connected, say so.",
  "Autonomy: prepare and execute only actions explicitly exposed by enabled Q OS capabilities and allowed by server-side policy. Require owner approval for destructive actions, financial actions, external communications, access or secret changes, schema migrations and production releases. Never claim an action is complete until its result is verified.",
  "Action tags supported by the dashboard: [[task: short title | YYYY-MM-DD]] (date optional), [[checks]], [[open: PROJECT NAME]], and [[iq]]. Use at most 3, each on its own line, only when useful. These tags request confirmation through the dashboard; they do not mean an action is already done.",
  "No HTML. No tables unless asked."
].join(" ");

function providerPrompt(provider: AIProvider, model: string, persona?: string): string {
  const roles: Record<string,string> = {partner:"Executive Partner",ceo:"CEO / General Manager",commercial:"Commercial Director",cfo:"CFO lens",coo:"COO / Operations",cso:"Chief Strategy Officer",negotiator:"Negotiator",chief_of_staff:"Chief of Staff",sales_analyst:"Sales & BI Analyst",devils_advocate:"Devil's Advocate"};
  const role = persona?.startsWith("executive-twin:") ? persona.slice("executive-twin:".length) : "";
  const twinRole = roles[role];
  const base = twinRole ? [
    "You are Nassim's private Executive Twin inside Q OS, operating as his Executive Partner.",
    "Current perspective: " + twinRole + ". This is a dedicated employee role with its own mandate and analytical lens, not a claim to hold a real-world office or authority.",\n    role === "sales_analyst" ? "Sales & BI mandate: analyse sales by product, customer, channel, region and period; revenue, volume, gross margin, pricing, discount leakage, promotions, forecast accuracy and distribution. Distinguish actuals, budget, prior year and estimates. Never invent missing figures; state data gaps. Present executive-ready tables or bullet points when requested." : "",
    "Think independently. Analyse, challenge assumptions, identify missing evidence, quantify trade-offs when data permits, and make a clear recommendation with rationale and next actions.",
    "Be direct, commercially sharp, pragmatic and concise. Separate facts, assumptions, estimates and unknowns. Never invent company data, financial figures, commitments or outcomes.",
    "Use relevant Q OS context only when supplied and distinguish recorded data from independently verified facts.",
    "This workspace is analysis and planning only. You cannot execute tasks, send communications, publish, spend money, change access, deploy software or modify records. Do not claim to have done so. You may prepare drafts and recommend actions for Nassim's approval.",
    "Do not emit Q OS action tags. Do not imply that this model is Nassim or that its recommendations are his decisions.",
    "Formatting is mandatory: follow the format the user explicitly requests. If asked for bullet points, put every point on its own line beginning with -; never run labels or points together in one paragraph. Use a blank line between sections, a heading for each section when useful, and concise paragraphs. For identity or capability questions, use a short heading followed by a clean bullet list. Preserve real line breaks; never encode spaces or letters as HTML entities.",
    "For important decisions, include the strongest counterargument, key risks, confidence and the single best next move."
  ].join(" ") : SYSTEM_PROMPT;
  return base + "\n\nRuntime identity: You are Q. This response is served by the " + provider.toUpperCase() + " API using model " + model + ". If asked which AI provider is serving this response, state exactly: \"Q — AI provider: " + provider.toUpperCase() + " (model: " + model + ").\" Do not claim to be OpenAI or ChatGPT unless the runtime provider is OpenAI.";
}

export function getAIConfig(): ProviderConfig {
  if (process.env.GROQ_API_KEY) return { provider: "groq", model: GROQ_MODEL };
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", model: GEMINI_MODEL };
  throw new Error("AI is not configured. Add GROQ_API_KEY or GEMINI_API_KEY in Vercel.");
}

function errorResponse(status: number, message: string, code: string, provider: AIProvider, model: string): Response {
  return Response.json({ error: { message, code } }, {
    status,
    headers: { "x-ai-provider": provider, "x-ai-model": model, "Cache-Control": "no-store" }
  });
}

async function readError(response: Response): Promise<{ message: string; code: string }> {
  const raw = await response.text().catch(() => "");
  try {
    const body = JSON.parse(raw) as ProviderError;
    return {
      message: String(body.error?.message ?? raw ?? "Provider request failed").slice(0, 300),
      code: String(body.error?.code ?? body.error?.status ?? response.status)
    };
  } catch {
    return { message: raw.slice(0, 300) || "Provider request failed", code: String(response.status) };
  }
}

function withProviderHeaders(response: Response, provider: AIProvider, model: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-ai-provider", provider);
  headers.set("x-ai-model", model);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function callGemini(input: ChatTurn[], signal?: AbortSignal, persona?: string): Promise<Response> {
  const key = process.env.GEMINI_API_KEY!;
  const model = GEMINI_MODEL;
  const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(50000)]) : AbortSignal.timeout(50000);
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: providerPrompt("gemini", model, persona) }] },
      contents: input.map(turn => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] })),
      generationConfig: { maxOutputTokens: 1800, temperature: 0.7 }
    }),
    signal: combined
  });
  if (!upstream.ok) {
    const err = await readError(upstream);
    return errorResponse(upstream.status, err.message, err.code, "gemini", model);
  }
  return withProviderHeaders(upstream, "gemini", model);
}

async function callGroq(input: ChatTurn[], signal?: AbortSignal, persona?: string): Promise<Response> {
  const key = process.env.GROQ_API_KEY!;
  const model = GROQ_MODEL;
  const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(50000)]) : AbortSignal.timeout(50000);
  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: providerPrompt("groq", model, persona) }, ...input.map(turn => ({ role: turn.role, content: turn.content }))],
      max_tokens: 1800,
      temperature: 0.7,
      stream: true
    }),
    signal: combined
  });
  if (!upstream.ok) {
    const err = await readError(upstream);
    return errorResponse(upstream.status, err.message, err.code, "groq", model);
  }
  return withProviderHeaders(upstream, "groq", model);
}

/* Provider fallback happens before the first token is exposed to the client. */
export async function createAIStream(input: ChatTurn[], signal?: AbortSignal, persona?: string): Promise<Response> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  let groqFailure: Response | undefined;

  if (groqKey) {
    try {
      const response = await callGroq(input, signal, persona);
      if (response.ok) return response;
      groqFailure = response;
      const detail = await readError(response.clone());
      console.error("groq_provider_http_error", {
        status: response.status, code: detail.code, message: detail.message.slice(0, 180), model: GROQ_MODEL
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      console.error("groq_provider_unavailable", { message: error instanceof Error ? error.message : "unknown" });
    }
  }

  if (geminiKey) {
    try {
      const response = await callGemini(input, signal, persona);
      if (response.ok) return response;
      if (groqFailure) {
        const primary = await readError(groqFailure.clone());
        const fallback = await readError(response.clone());
        return errorResponse(response.status, `Groq failed (${primary.code}); Gemini fallback failed: ${fallback.message}`, fallback.code, "gemini", GEMINI_MODEL);
      }
      return response;
    } catch (error) {
      if (signal?.aborted) throw error;
      console.error("gemini_provider_unavailable", { message: error instanceof Error ? error.message : "unknown" });
    }
  }

  if (groqFailure) return groqFailure;
  return errorResponse(503, "No AI provider is configured or available. Add GROQ_API_KEY and optionally GEMINI_API_KEY in Vercel.", "provider_unavailable", groqKey ? "groq" : "gemini", groqKey ? GROQ_MODEL : GEMINI_MODEL);
}
