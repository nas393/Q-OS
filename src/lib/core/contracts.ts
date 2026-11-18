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
