"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import type { FinanceSummary, TopicOverview } from "@/lib/api";

type Tile = {
  label: string;
  value: string;
  sub: string;
};

/**
 * KPI row: tasks, findings, active agents, and capped spend. Fail-soft to
 * skeletons while the overview loads.
 */
export function KpiTiles({
  overview,
  finance,
  findings,
  loading,
}: {
  overview: TopicOverview | null;
  finance: FinanceSummary | null;
  findings: number;
  loading: boolean;
}) {
  const k = overview?.kpis ?? {};
  const totalAgents = k.total_agents ?? 9;
  // Prefer the REAL per-company AI spend from /finance/summary; fall back to
  // the overview estimate only when the finance snapshot isn't available yet.
  const spend =
    finance?.ai_spend_cents != null
      ? finance.ai_spend_cents / 100
      : (k.spend_usd ?? 0);
  const cap =
    finance?.ai_spend_cap_cents != null
      ? finance.ai_spend_cap_cents / 100
      : k.spend_cap_usd;

  const tiles: Tile[] = [
    {
      label: "Tasks today",
      value: String(k.tasks_today ?? 0),
      sub: "queued by the CEO",
    },
    {
      label: "Findings",
      value: String(findings || k.findings || 0),
      sub: "research gathered",
    },
    {
      label: "Agents active",
      value: `${k.active_agents ?? 0}/${totalAgents}`,
      sub: "working now",
    },
    {
      label: "Est. spend",
      value: `$${Number(spend).toFixed(2)}`,
      sub: cap ? `capped at $${Number(cap).toFixed(2)}` : "capped & sandboxed",
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-card border border-line bg-panel px-4 py-3.5"
        >
          <div className="text-[12px] uppercase tracking-wide text-mut">
            {t.label}
          </div>
          {loading && !overview ? (
            <Skeleton className="mt-2 h-6 w-16" />
          ) : (
            <div className="mt-1.5 text-[24px] font-bold">{t.value}</div>
          )}
          <div className="mt-0.5 text-[12px] text-dim">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}
