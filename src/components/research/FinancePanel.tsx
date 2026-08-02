"use client";

import { SectionPanel } from "@/components/research/SectionPanel";

/** Finance agent: P&L / financial analysis + this company's AI spend. */
export function FinancePanel({ topicId }: { topicId: string }) {
  return (
    <SectionPanel
      topicId={topicId}
      sectionKey="finance"
      title="The numbers"
      subtitle="P&L, financial analysis, and this company's capped AI spend."
      emptyLabel="The finance agent is crunching the first snapshot…"
      trendLabel="Spend & revenue trend"
    />
  );
}
