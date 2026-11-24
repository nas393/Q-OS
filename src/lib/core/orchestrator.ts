import { createAIStream } from "@/lib/ai/provider";
import { classifyIntent } from "@/lib/core/intent";
import { formatServerContext, loadServerContext } from "@/lib/core/context";
import { QCoreError } from "@/lib/core/errors";
import type { QIntent, QTurn } from "@/lib/core/contracts";
import type {ChatWorkspace} from "@/lib/chat-workspace";
import {retrieveExecutiveMemory} from "@/lib/executive-memory";

export async function orchestrateChat(input: {
  turns: QTurn[];
  clientContext?: string;
  signal?: AbortSignal;
  workspace?: ChatWorkspace;
}): Promise<{ intent: QIntent; response: Response }> {
  const turns = input.turns.map(turn => ({ ...turn }));
  const latestUser = [...turns].reverse().find(turn => turn.role === "user");
  if (!latestUser) throw new QCoreError("INVALID_REQUEST", "A user message is required.", 400);

  const intent = classifyIntent(latestUser.content);
  const context = await loadServerContext("owner");
  const memory = input.workspace === "executive_twin" ? await retrieveExecutiveMemory("owner", latestUser.content) : "";
  const requestText = latestUser.content;
  const sections = [
    formatServerContext(context),
    memory,
    input.clientContext?.trim()
      ? `CLIENT DASHBOARD CONTEXT (unverified; may be stale or modified; do not present as independently verified):\n${input.clientContext.trim()}`
      : "",
    `USER REQUEST:\n${requestText}`
  ].filter(Boolean);

  latestUser.content = sections.join("\n\n");
  const response = await createAIStream(turns, input.signal, input.workspace ?? "general");
  return { intent, response };
}
