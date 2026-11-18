import { listTasks } from "@/lib/tasks";
import { recentAlerts } from "@/lib/alerts";
import { loadMetrics } from "@/lib/metrics";
import { PORTFOLIO_PROJECTS } from "@/lib/portfolio/registry";
import type { QContextMetric, QServerContext } from "@/lib/core/contracts";

type MetricEntry = { value: unknown; source: string; updatedAt: string };

function metricRecords(input: Record<string, unknown>): QContextMetric[] {
  const output: QContextMetric[] = [];
  for (const [key, raw] of Object.entries(input)) {
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const item of raw.slice(0, 6)) {
        const entry = item as MetricEntry;
        if (entry && typeof entry === "object") {
          output.push({ key, value: entry.value, source: entry.source, updatedAt: entry.updatedAt });
        }
      }
      continue;
    }
    const entry = raw as MetricEntry;
    if (!entry || typeof entry !== "object") continue;
    let value = entry.value;
    if (key === "xauusd" && value && typeof value === "object") {
      const gold = value as { price?: number; changePct?: number; timeframe?: string };
      value = { price: gold.price, changePct: gold.changePct, timeframe: gold.timeframe };
    }
    output.push({ key, value, source: entry.source, updatedAt: entry.updatedAt });
  }
  return output;
}

/* Server-recorded context. Each subsystem fails independently so chat remains available during partial outages. */
export async function loadServerContext(ownerId = "owner"): Promise<QServerContext> {
  const [taskResult, alertResult, metricResult] = await Promise.allSettled([
    listTasks(),
    recentAlerts(10),
    loadMetrics()
  ]);

  const tasksAvailable = taskResult.status === "fulfilled";
  const alertsAvailable = alertResult.status === "fulfilled";
  const metricsAvailable = metricResult.status === "fulfilled" && metricResult.value.error === null;

  const tasks = tasksAvailable
    ? taskResult.value.filter(task => !task.done).slice(0, 12).map(task => ({
        id: task.id, title: task.title, project: task.project, due: task.due, priority: task.priority
      }))
    : [];

  const alerts = alertsAvailable
    ? alertResult.value.slice(0, 10).map(alert => ({
        id: alert.id, level: alert.level, title: alert.title, body: alert.body, createdAt: alert.createdAt
      }))
    : [];

  const metrics = metricsAvailable
    ? metricRecords(metricResult.value.metrics as unknown as Record<string, unknown>)
    : [];

  return {
    ownerId,
    generatedAt: new Date().toISOString(),
    portfolio: PORTFOLIO_PROJECTS.map(project => ({
      id: project.id,
      name: project.name,
      priority: project.priority,
      area: project.area,
      nextAction: project.next,
      dataStatus: "configuration_only" as const
    })),
    tasks,
    alerts,
    metrics,
    availability: {
      tasks: tasksAvailable ? "available" : "unavailable",
      alerts: alertsAvailable ? "available" : "unavailable",
      metrics: metricsAvailable ? "available" : "unavailable"
    }
  };
}

export function formatServerContext(context: QServerContext): string {
  return [
    "SERVER-RECORDED Q OS CONTEXT",
    `Generated: ${context.generatedAt}`,
    "Interpretation: portfolio entries below are static configuration only, not live deployment verification. Tasks and alerts are stored Q OS records. Metrics are stored ingested values; their source and timestamp are provided, but Q has not independently audited the originating system.",
    `Availability: ${JSON.stringify(context.availability)}`,
    `Portfolio configuration: ${JSON.stringify(context.portfolio)}`,
    `Open tasks: ${JSON.stringify(context.tasks)}`,
    `Unacknowledged alerts: ${JSON.stringify(context.alerts)}`,
    `Stored metrics: ${JSON.stringify(context.metrics)}`
  ].join("\n").slice(0, 7600);
}
