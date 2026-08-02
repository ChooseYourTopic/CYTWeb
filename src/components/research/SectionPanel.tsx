"use client";

import { PanelShell } from "@/components/research/PanelShell";
import { ProgressiveCard } from "@/components/research/ProgressiveCard";
import { Sparkline } from "@/components/research/Sparkline";
import { useSectionData } from "@/hooks/useSectionData";
import { cytapi, type FetchableSection, type SectionItem } from "@/lib/api";

/**
 * Generic progressive-disclosure section over GET /topic/{id}/{section}.
 * Reused by every per-agent panel (finance/outreach/support/ads/build and the
 * competitor/market/drafts panels). Renders an optional trend sparkline if any
 * item carries a `series`.
 */
export function SectionPanel({
  topicId,
  sectionKey,
  title,
  subtitle,
  emptyLabel,
  trendLabel,
}: {
  topicId: string;
  sectionKey: FetchableSection;
  title: string;
  subtitle?: string;
  emptyLabel?: string;
  trendLabel?: string;
}) {
  const { data, loading } = useSectionData<SectionItem[]>(sectionKey, () =>
    cytapi.section(topicId, sectionKey),
  );
  const items = data ?? [];
  const trend = trendLabel
    ? items.find((i) => i.series && i.series.length > 0)?.series
    : undefined;

  return (
    <PanelShell
      title={title}
      subtitle={subtitle}
      loading={loading}
      isEmpty={items.length === 0}
      emptyLabel={emptyLabel}
    >
      {trend && (
        <div className="animate-rise rounded-[11px] border border-line bg-panel2 p-4">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-mut">
            {trendLabel}
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
