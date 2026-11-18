export type AIProvider = "groq" | "gemini";

export function splitSseEvents(buffer: string, flush = false): { events: string[]; remainder: string } {
  const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n\n");
  if (flush) return { events: parts.filter(part => part.trim()), remainder: "" };
  return { events: parts.slice(0, -1).filter(part => part.trim()), remainder: parts.at(-1) ?? "" };
}

export function readSseData(event: string): string | null {
  const lines = event.split("\n");
  const data = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, ""));
  return data.length ? data.join("\n") : null;
}

export function extractProviderText(provider: AIProvider, rawData: string): string {
  if (!rawData || rawData === "[DONE]") return "";
  let payload: unknown;
  try { payload = JSON.parse(rawData); } catch { return ""; }
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  if (provider === "groq") {
    const choices = Array.isArray(p.choices) ? p.choices : [];
    const delta = (choices[0] as { delta?: { content?: unknown } } | undefined)?.delta?.content;
    return typeof delta === "string" ? delta : "";
  }
  const candidates = Array.isArray(p.candidates) ? p.candidates : [];
  const content = (candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } } | undefined)?.content;
  return (content?.parts ?? []).map(part => typeof part.text === "string" ? part.text : "").join("");
}
