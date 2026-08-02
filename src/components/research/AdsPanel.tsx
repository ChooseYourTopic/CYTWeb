"use client";

import { SectionPanel } from "@/components/research/SectionPanel";

/** Ads management agent: campaign plans + budget/metrics. */
export function AdsPanel({ topicId }: { topicId: string }) {
  return (
    <SectionPanel
      topicId={topicId}
      sectionKey="ads"
      title="Paid growth"
      subtitle="Ad campaign plans with budgets and projected metrics — draft-only."
      emptyLabel="The ads agent is drafting your first campaign plan…"
      trendLabel="Projected performance"
    />
  );
}
