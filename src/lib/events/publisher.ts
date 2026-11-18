import { writeAudit } from "@/lib/audit";
import type { QEvent } from "@/lib/events/contracts";

/* Phase 1 adapter: reuse activity_logs. No duplicate event table or schema migration. */
export async function publishQEvent(event: QEvent): Promise<void> {
  await writeAudit({
    userId: event.actor.type === "owner" ? event.actor.id ?? "owner" : null,
    actorType: event.actor.type,
    actorId: event.actor.id ?? null,
    action: event.type,
    outcome: event.outcome,
    details: {
      occurredAt: event.occurredAt,
      source: event.source,
      entityId: event.entityId ?? null,
      ...(event.data ?? {})
    }
  });
}
