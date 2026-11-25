import { after } from "next/server";
import { requireOwner } from "@/lib/auth";
import { loadApprovals } from "@/lib/approvals";
import { loadMetrics } from "@/lib/metrics";
import { collectAppStats, loadAppStats } from "@/lib/app-stats";
import { PORTFOLIO_PROJECTS } from "@/lib/portfolio/registry";
import CommandFloor from "@/components/command/command-floor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Command centre" };

/* The floor loads live project, task and check data in the browser, so the server only resolves what
   needs the server: the owner check, the approvals inbox, and the pushed gold price. */
export default async function DashboardPage() {
  await requireOwner();
  const [approvals, metrics, appStats] = await Promise.all([
    loadApprovals(),
    loadMetrics(),
    loadAppStats().catch(() => null)
  ]);
  // App stats are still refreshed after the page is sent, as before (never delays it).
  if (!appStats || appStats.stale) after(() => collectAppStats().catch(() => undefined));

  const x = metrics.metrics.xauusd;
  const desks = PORTFOLIO_PROJECTS.map(p => ({ id: p.id, name: p.name, area: p.area, priority: p.priority, next: p.next }));
  return <CommandFloor desks={desks} approvals={approvals}
    xauusd={x ? { price: x.value.price, changePct: x.value.changePct, source: x.source, updatedAt: x.updatedAt } : null} />;
}
