"use client";

import { PanelShell } from "@/components/research/PanelShell";
import { ProgressiveCard } from "@/components/research/ProgressiveCard";
import { Sparkline } from "@/components/research/Sparkline";
import type { TopicOverview } from "@/lib/api";

/**
 * Overview tab — the "living report": a streaming exec summary, a trend
 * sparkline, and the highest-level decision cards. Fills in progressively.
 */
export function LivingReport({
  overview,
  loading,
}: {
  overview: TopicOverview | null;
  loading: boolean;
}) {
  const items = overview?.items ?? [];
  const isEmpty = items.length === 0 && !overview?.exec_summary;

  return (
    <PanelShell
      title="What the team decided"
      subtitle="Fills in live as agents finish work."
      loading={loading}
      isEmpty={isEmpty}
      emptyLabel="Writing your report… agents are researching."
    >
      {overview?.exec_summary && (
        <div className="animate-rise rounded-[11px] border border-line bg-panel2 p-4">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-mut">
            Executive summary
          </div>
          <p className="text-[14px] leading-relaxed text-ink/90">
            {overview.exec_summary}
          </p>
        </div>
      )}

      {overview?.spark && overview.spark.length > 0 && (
        <div className="animate-rise rounded-[11px] border border-line bg-panel2 p-4">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-mut">
            Momentum
          </div>
          <Sparkline data={overview.spark} />
        </div>
      )}

      {items.map((item) => (
        <ProgressiveCard key={item.id} item={item} />
      ))}
    </PanelShell>
  );
}
