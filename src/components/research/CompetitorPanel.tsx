"use client";

import { PanelShell } from "@/components/research/PanelShell";
import { ProgressiveCard } from "@/components/research/ProgressiveCard";
import { useSectionData } from "@/hooks/useSectionData";
import { cytapi, type SectionItem } from "@/lib/api";

export function CompetitorPanel({ topicId }: { topicId: string }) {
  const { data, loading } = useSectionData<SectionItem[]>(
    "competitors",
    () => cytapi.section(topicId, "competitors"),
  );
  const items = data ?? [];

  return (
    <PanelShell
      title="Who you are up against"
      subtitle="Competitor profiles — expand any card for the full teardown."
      loading={loading}
      isEmpty={items.length === 0}
    >
      {items.map((item) => (
        <ProgressiveCard key={item.id} item={item} />
      ))}
    </PanelShell>
  );
}
