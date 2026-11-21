export type QIntent = "conversation" | "analysis" | "research" | "portfolio" | "action_proposal";

export type QTurn = { role: "user" | "assistant"; content: string };

export type QRequest = {
  message: string;
  conversationId?: string;
  clientContext?: string;
};

export type QContextAvailability = "available" | "unavailable";

export type QContextMetric = {
  key: string;
  value: unknown;
  source: string;
  updatedAt: string;
};

export type QServerContext = {
  ownerId: string;
  generatedAt: string;
  /** Numbers collected from each app (app id → "63 courses · 4 certificates", with collection time). */
  appNumbers?: Record<string, { line: string; updatedAt: string }>;
  portfolio: Array<{
    id: string;
    name: string;
    priority: string;
    area: string;
    nextAction: string;
    dataStatus: "configuration_only";
  }>;
  tasks: Array<{
    id: string;
    title: string;
    project: string | null;
    due: string | null;
    priority: string;
  }>;
  alerts: Array<{
    id: number;
    level: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  metrics: QContextMetric[];
  integrations: Array<{ id: string; provider: string; purpose: string; capabilities: string[]; status: "configured" | "not_configured" }>;
  availability: {
    tasks: QContextAvailability;
    alerts: QContextAvailability;
    metrics: QContextAvailability;
  };
};

export type QResponseMetadata = {
  intent: QIntent;
  provider: string;
  model: string;
  conversationId: string;
};

export type QStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "completed"; conversationId: string }
  | { type: "failed"; message: string };
