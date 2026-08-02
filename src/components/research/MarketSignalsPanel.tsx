"use client";

import { PanelShell } from "@/components/research/PanelShell";
import { ProgressiveCard } from "@/components/research/ProgressiveCard";
import { Sparkline } from "@/components/research/Sparkline";
import { useSectionData } from "@/hooks/useSectionData";
import { cytapi, type SectionItem } from "@/lib/api";

export function MarketSignalsPanel({ topicId }: { topicId: string }) {
  const { data, loading } = useSectionData<SectionItem[]>(
    "market",
    () => cytapi.section(topicId, "market"),
  );
  const items = data ?? [];
  // A signal item may carry a `series` for a trend line.
  const trend = items.find((i) => i.series && i.series.length > 0)?.series;

  return (
    <PanelShell
      title="Where the demand is"
      subtitle="Market signals and demand trends the team is tracking."
      loading={loading}
      isEmpty={items.length === 0}
    >
      {trend && (
        <div className="animate-rise rounded-[11px] border border-line bg-panel2 p-4">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-mut">
            Demand trend
          </div>
          <Sparkline data={trend} height={140} showAxes />
        </div>
      )}
      {items.map((item) => (
        <ProgressiveCard key={item.id} item={item} />
      ))}
    </PanelShell>
  );
}
