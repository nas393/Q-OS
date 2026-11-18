export type IntegrationStatus = "configured" | "not_configured";

export type IntegrationCapability = "read" | "write" | "stream" | "monitor";

export type IntegrationDefinition = {
  id: string;
  provider: string;
  purpose: string;
  capabilities: IntegrationCapability[];
  requiredEnvironment: string[];
};

export type IntegrationHealth = IntegrationDefinition & {
  status: IntegrationStatus;
};
