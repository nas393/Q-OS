import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { readSession } from "@/lib/session";
import { getAIConfig } from "@/lib/ai/provider";
import { orchestrateChat } from "@/lib/core/orchestrator";
import { extractProviderText, readSseData, splitSseEvents, type AIProvider } from "@/lib/ai/stream";
import { jsonError, requestOriginAllowed } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs", dynamic = "force-dynamic", maxDuration = 60;
const OWNER_ID = "owner";

export async function GET() {
  if (!await readSession()) return jsonError(401, "Unauthorized");
  try {
    const result = await getDb().query(
      "SELECT id,title,status,created_at,updated_at FROM conversations WHERE user_id=$1 AND status='active' ORDER BY updated_at DESC LIMIT 50",
      [OWNER_ID]
    );
    return NextResponse.json({ conversations: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(503, "Conversation storage unavailable");
  }
}

export async function POST(request: Request) {
  if (!await readSession()) return jsonError(401, "Unauthorized");
  if (!requestOriginAllowed(request)) return jsonError(403, "Request origin rejected");

  const parsed = z.object({
    message: z.string().trim().min(1).max(12000),
    conversationId: z.string().uuid().optional(),
    portfolioContext: z.string().max(9000).optional()
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Enter a message (maximum 12,000 characters).");

  let config;
  try { config = getAIConfig(); }
  catch { return jsonError(503, "AI provider is not configured. Add GROQ_API_KEY or GEMINI_API_KEY in Vercel."); }

  const db = getDb();
  let conversationId = parsed.data.conversationId;
  try {
    if (conversationId) {
      const check = await db.query(
        "SELECT id FROM conversations WHERE id=$1 AND user_id=$2 AND status='active'",
        [conversationId, OWNER_ID]
      );
      if (!check.rowCount) return jsonError(404, "Conversation not found.");
    } else {
      const created = await db.query(
        "INSERT INTO conversations (user_id,title) VALUES ($1,$2) RETURNING id",
        [OWNER_ID, parsed.data.message.slice(0, 72)]
      );
      conversationId = created.rows[0].id;
    }

    const activeConversationId = conversationId as string;
    await db.query(
      "INSERT INTO messages (conversation_id,role,content) VALUES ($1,'user',$2)",
      [activeConversationId, parsed.data.message]
    );
    const history = await db.query(
      "SELECT role,content FROM messages WHERE conversation_id=$1 AND role IN ('user','assistant') AND COALESCE(metadata->>'status','completed')='completed' ORDER BY created_at DESC LIMIT 30",
      [activeConversationId]
    );
    const turns = history.rows.reverse().map((row: { role: "user" | "assistant"; content: string }) => ({
      role: row.role, content: row.content
    }));

    const abortController = new AbortController();
    const signal = AbortSignal.any([request.signal, abortController.signal]);
    const orchestration = await orchestrateChat({
      turns,
      clientContext: parsed.data.portfolioContext,
      signal
    });
    const intent = orchestration.intent;
    const upstream = orchestration.response;
    const actualProvider = upstream.headers.get("x-ai-provider") ?? config.provider;
    const actualModel = upstream.headers.get("x-ai-model") ?? config.model;

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => "");
      let providerMessage = "", providerCode = "";
      try {
        const payload = JSON.parse(raw) as { error?: { message?: unknown; code?: unknown; type?: unknown } };
        providerMessage = String(payload.error?.message ?? "");
        providerCode = String(payload.error?.code ?? payload.error?.type ?? "");
      } catch {}
      console.error("ai_provider_rejected_request", {
        status: upstream.status, code: providerCode, message: providerMessage.slice(0, 240)
      });
      await writeAudit({
        userId: OWNER_ID, actorType: "owner", actorId: OWNER_ID,
        action: "chat.response", outcome: "failed",
        details: { provider: actualProvider, status: upstream.status, code: providerCode, intent }
      });
      return jsonError(502, `AI provider error (${upstream.status})${providerCode ? ` [${providerCode}]` : ""}: ${providerMessage.slice(0, 180) || "Check provider configuration and billing."}`);
    }

    const provider = actualProvider as AIProvider;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let cancelled = false;
    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController<Uint8Array>, payload: Record<string, unknown>) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    };

    const clientStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "", answer = "";
        const consume = async (event: string) => {
          const data = readSseData(event);
          if (!data || data === "[DONE]") return;
          let parsedEvent: unknown;
          try { parsedEvent = JSON.parse(data); } catch { return; }
          if (parsedEvent && typeof parsedEvent === "object" && "error" in parsedEvent) {
            const detail = (parsedEvent as { error?: { message?: unknown } }).error?.message;
            throw new Error(String(detail ?? "AI provider stream failed").slice(0, 220));
          }
          const delta = extractProviderText(provider, data);
          if (!delta) return;
          answer += delta;
          if (!cancelled) send(controller, { delta, conversationId: activeConversationId });
        };

        try {
          for (;;) {
            const item = await reader.read();
            if (item.done) break;
            buffer += decoder.decode(item.value, { stream: true });
            const parsed = splitSseEvents(buffer);
            buffer = parsed.remainder;
            for (const event of parsed.events) await consume(event);
          }
          buffer += decoder.decode();
          const finalEvents = splitSseEvents(buffer, true);
          for (const event of finalEvents.events) await consume(event);

          if (cancelled || signal.aborted) return;
          if (!answer.trim()) throw new Error("AI provider returned an empty stream.");

          await db.query(
            "INSERT INTO messages (conversation_id,role,content,metadata) VALUES ($1,'assistant',$2,$3::jsonb)",
            [activeConversationId, answer, JSON.stringify({ provider: actualProvider, model: actualModel, status: "completed", intent })]
          );
          await db.query("UPDATE conversations SET updated_at=now() WHERE id=$1", [activeConversationId]);
          await writeAudit({
            userId: OWNER_ID, actorType: "owner", actorId: OWNER_ID,
            action: "chat.response", outcome: "succeeded",
            details: { provider: actualProvider, model: actualModel, streamed: true, intent }
          });
          send(controller, { done: true, conversationId: activeConversationId });
          controller.close();
        } catch (error) {
          if (cancelled || signal.aborted) {
            await writeAudit({
              userId: OWNER_ID, actorType: "owner", actorId: OWNER_ID,
              action: "chat.response", outcome: "cancelled",
              details: { provider: actualProvider, model: actualModel, partial: answer.length > 0, intent }
            });
            return;
          }
          console.error("ai_stream_failed", {
            provider: actualProvider, model: actualModel,
            error: error instanceof Error ? error.message.slice(0, 180) : "unknown"
          });
          await writeAudit({
            userId: OWNER_ID, actorType: "owner", actorId: OWNER_ID,
            action: "chat.response", outcome: "failed",
            details: { provider: actualProvider, model: actualModel, partial: answer.length > 0 }
          });
          if (!cancelled) {
            send(controller, { error: error instanceof Error ? error.message : "AI stream failed." });
            controller.close();
          }
        } finally {
          reader?.releaseLock();
        }
      },
      async cancel() {
        cancelled = true;
        abortController.abort();
        await reader?.cancel().catch(() => {});
      }
    });

    return new Response(clientStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "x-ai-provider": actualProvider,
        "x-ai-model": actualModel
      }
    });
  } catch (error) {
    if (request.signal.aborted) return jsonError(499, "Request cancelled.");
    console.error("chat_request_failed", { error: error instanceof Error ? error.name : "unknown" });
    return jsonError(503, "Chat service temporarily unavailable.");
  }
}
