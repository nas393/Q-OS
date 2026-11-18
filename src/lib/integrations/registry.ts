import type { IntegrationDefinition, IntegrationHealth } from "@/lib/integrations/contracts";

export const INTEGRATION_DEFINITIONS: readonly IntegrationDefinition[] = [
  { id: "neon", provider: "Neon", purpose: "Q OS PostgreSQL storage", capabilities: ["read", "write"], requiredEnvironment: ["DATABASE_URL"] },
  { id: "groq", provider: "Groq", purpose: "Primary AI chat provider", capabilities: ["stream"], requiredEnvironment: ["GROQ_API_KEY"] },
  { id: "gemini", provider: "Google Gemini", purpose: "Fallback AI chat provider", capabilities: ["stream"], requiredEnvironment: ["GEMINI_API_KEY"] },
  { id: "github", provider: "GitHub", purpose: "Repository and issue intelligence", capabilities: ["read"], requiredEnvironment: ["GITHUB_TOKEN"] },
  { id: "vercel", provider: "Vercel", purpose: "Deployment and runtime intelligence", capabilities: ["read"], requiredEnvironment: ["VERCEL_TOKEN"] },
  { id: "metrics_ingest", provider: "Q Metrics Ingest", purpose: "Receive metrics from connected projects", capabilities: ["write"], requiredEnvironment: ["INGEST_TOKEN"] },
  { id: "scheduler", provider: "Vercel Cron / GitHub Actions", purpose: "Scheduled system checks", capabilities: ["monitor"], requiredEnvironment: ["CRON_SECRET"] }
] as const;

/* Configured means a required variable exists; it does not claim the remote service is reachable. */
export function listIntegrationHealth(): IntegrationHealth[] {
  return INTEGRATION_DEFINITIONS.map(integration => ({
    ...integration,
    status: integration.requiredEnvironment.every(name => Boolean(process.env[name]?.trim()))
      ? "configured"
      : "not_configured"
  }));
}
