import type { QIntent } from "@/lib/core/contracts";

/* Deterministic routing hint only. It never grants permission to execute an action. */
export function classifyIntent(message: string): QIntent {
  const value = message.toLowerCase();

  if (/\b(create|add|schedule|execute|deploy|delete|send|publish|change|update|cancel|book|buy|sell|transfer)\b/.test(value)) {
    return "action_proposal";
  }
  if (/\b(portfolio|projects?|priorit(y|ies)|roadmap|milestone|venture|ecosystem)\b/.test(value)) {
    return "portfolio";
  }
  if (/\b(research|find out|look up|latest|news|sources|investigate|benchmark)\b/.test(value)) {
    return "research";
  }
  if (/\b(analy[sz]e|analysis|compare|evaluate|assess|why|risk|scenario|strategy|recommend)\b/.test(value)) {
    return "analysis";
  }
  return "conversation";
}
