"use client";

import { SectionPanel } from "@/components/research/SectionPanel";

/** Code generation agent: product feature specs + changelog. */
export function BuildPanel({ topicId }: { topicId: string }) {
  return (
    <SectionPanel
      topicId={topicId}
      sectionKey="build"
      title="What's being built"
      subtitle="Product feature specs and the changelog as the site takes shape."
      emptyLabel="The build agent is scaffolding your product…"
    />
  );
}
