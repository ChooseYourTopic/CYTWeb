"use client";

import { PanelShell } from "@/components/research/PanelShell";
import { ProgressiveCard } from "@/components/research/ProgressiveCard";
import { useSectionData } from "@/hooks/useSectionData";
import { cytapi, type SectionItem } from "@/lib/api";

export function DraftsPanel({ topicId }: { topicId: string }) {
  const { data, loading } = useSectionData<SectionItem[]>(
    "drafts",
    () => cytapi.section(topicId, "drafts"),
  );
  const items = data ?? [];

  return (
    <PanelShell
      title="What is being written"
      subtitle="Landing copy, social posts and outreach — draft-only until you approve."
      loading={loading}
      isEmpty={items.length === 0}
    >
      {items.map((item) => (
        <ProgressiveCard key={item.id} item={item} />
      ))}
    </PanelShell>
  );
}
