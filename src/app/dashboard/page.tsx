import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { loadMetrics } from "@/lib/metrics";
import WebOS from "@/components/web-os";

export const dynamic = "force-dynamic";

/* The Command Center must open even when the database is slow or down: each query falls back on its own. */
const count = (p: Promise<{ rows: Array<{ count: number }> }>) => p.then(r => r.rows[0]?.count ?? 0).catch(() => null);

export default async function DashboardPage() {
  await requireOwner();
  let db: ReturnType<typeof getDb> | null = null;
  try { db = getDb(); } catch { db = null; }
  const [conversations, activity, metrics] = await Promise.all([
    db ? count(db.query("SELECT count(*)::int AS count FROM conversations WHERE user_id=$1", ["owner"])) : Promise.resolve(null),
    db ? count(db.query("SELECT count(*)::int AS count FROM activity_logs WHERE created_at>now()-interval '24 hours'")) : Promise.resolve(null),
    loadMetrics().catch(() => ({ metrics: {}, error: "Market data unavailable" }))
  ]);
  const dbDown = conversations === null && activity === null;
  return <WebOS conversationCount={conversations ?? 0} activityCount={activity ?? 0} metrics={metrics.metrics}
    metricsError={dbDown ? "Database unavailable: showing live project data only. Saved tasks and alerts will return when it recovers." : metrics.error} />;
}
