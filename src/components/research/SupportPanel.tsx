"use client";

import { SectionPanel } from "@/components/research/SectionPanel";

/** Customer support agent: top questions + drafted replies. */
export function SupportPanel({ topicId }: { topicId: string }) {
  return (
    <SectionPanel
      topicId={topicId}
      sectionKey="support"
      title="From the inbox"
      subtitle="Top customer questions and drafted replies for your review."
      emptyLabel="No customer questions yet — the support agent is standing by…"
    />
  );
}
