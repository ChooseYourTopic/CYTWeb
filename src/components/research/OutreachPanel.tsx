"use client";

import { SectionPanel } from "@/components/research/SectionPanel";

/** Email outreach agent: campaigns, prospect segments, draft emails. */
export function OutreachPanel({ topicId }: { topicId: string }) {
  return (
    <SectionPanel
      topicId={topicId}
      sectionKey="outreach"
      title="Reaching out"
      subtitle="Email campaigns, prospect segments, and draft emails — nothing sends without your go."
      emptyLabel="The outreach agent is building your prospect list…"
    />
  );
}
