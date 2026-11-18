export type QEventOutcome = "started" | "succeeded" | "failed" | "blocked" | "cancelled";

export type QEvent = {
  type: string;
  occurredAt: string;
  actor: { type: "owner" | "system"; id?: string | null };
  source: string;
  entityId?: string | null;
  outcome: QEventOutcome;
  data?: Record<string, unknown>;
};
