"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Rocket, Megaphone } from "lucide-react";
import { SectionPanel } from "@/components/research/SectionPanel";
import { ContextDropInput } from "@/components/research/ContextDropInput";

/**
 * Release notes + roadmap content.
 *
 * These are typed, static arrays for now so the shape is stable and a backend
 * feed (e.g. GET /platform/changelog + /platform/roadmap) can drop straight in
 * later — replace the seed data below with a fetch, keep the same types, and the
 * render code stays untouched.
 */

type ReleaseTag = "New" | "Improved" | "Fixed";

type ReleaseNote = {
  /** Human title of the shipped change. */
  title: string;
  /** One-line, user-facing summary — no internal jargon or file paths. */
  summary: string;
  /** Display date the change shipped. */
  date: string;
  /** How to badge it in the list. */
  tag: ReleaseTag;
};

type RoadmapStatus = "In progress" | "Planned" | "Exploring";

type RoadmapItem = {
  /** Human title of the upcoming capability. */
  title: string;
  /** One-line, user-facing summary of what it will do. */
  summary: string;
  /** Where it sits in the pipeline. */
  status: RoadmapStatus;
};

// Reverse-chronological: newest ship first.
const RELEASE_NOTES: ReleaseNote[] = [
  {
    title: "Work with your own Claude subscription",
    summary:
      "Connect Claude Code and run your agent team on your own plan — no separate per-token API bill.",
    date: "Aug 7, 2026",
    tag: "New",
  },
  {
    title: "Real-time agent status lights",
    summary:
      "Every agent now shows a live light — green working or idle, yellow paused, blue waiting on you, red error.",
    date: "Aug 6, 2026",
    tag: "New",
  },
  {
    title: "Choose how your agents connect",
    summary:
      "A connection-mode selector in Settings: use an API key, your own subscription, or OAuth (coming soon).",
    date: "Aug 5, 2026",
    tag: "New",
  },
  {
    title: "Build your team from your roster",
    summary:
      "Pull any agent from your roster straight onto the Agent-team rail to put it to work.",
    date: "Aug 4, 2026",
    tag: "Improved",
  },
  {
    title: "Business profile at a glance",
    summary:
      "Your business type and industry now show as tiles on the overview so the plan stays grounded.",
    date: "Aug 2, 2026",
    tag: "New",
  },
  {
    title: "Full control over integrations",
    summary:
      "Connect, disconnect, and rotate the key on every integration whenever you need to.",
    date: "Jul 31, 2026",
    tag: "Improved",
  },
  {
    title: "Heads-up when a key runs dry",
    summary:
      "The Models tab now warns you about a key that's out of credits before your agents try to spend on it.",
    date: "Jul 29, 2026",
    tag: "Fixed",
  },
  {
    title: "Custom skills and loops per agent",
    summary:
      "Give any agent its own custom skills and repeating loops right from the agent's profile.",
    date: "Jul 26, 2026",
    tag: "New",
  },
];

const ROADMAP: RoadmapItem[] = [
  {
    title: "Central Status board",
    summary:
      "One place where every service reports its health so you can spot outages at a glance.",
    status: "In progress",
  },
  {
    title: "OAuth subscription connect",
    summary:
      "Link your Claude subscription in one click with OAuth — pending Anthropic availability.",
    status: "In progress",
  },
  {
    title: "Social media tab",
    summary:
      "Draft, schedule, and track your company's social posts without leaving the dashboard.",
    status: "Planned",
  },
  {
    title: "Reporting & analytics",
    summary:
      "Trends and results across your project, packaged into shareable reports.",
    status: "Planned",
  },
  {
    title: "Public help center",
    summary:
      "A searchable knowledge base and guides you can point your own customers to.",
    status: "Exploring",
  },
  {
    title: "Investment planning",
    summary:
      "Model funding scenarios and let your agents pressure-test the numbers.",
    status: "Exploring",
  },
  {
    title: "Business process management",
    summary:
      "Map and automate repeatable workflows so your agents run them end to end.",
    status: "Exploring",
  },
];

const RELEASE_TAG_CLS: Record<ReleaseTag, string> = {
  New: "border-[#1f3d2e] bg-[#0e1c16] text-good",
  Improved: "border-brand/40 bg-brand/10 text-brand",
  Fixed: "border-[#3a3320] bg-[#1a1608] text-warn",
};

const ROADMAP_STATUS_CLS: Record<RoadmapStatus, string> = {
  "In progress": "border-[#1f3d2e] bg-[#0e1c16] text-good",
  Planned: "border-brand/40 bg-brand/10 text-brand",
  Exploring: "border-line bg-panel px-1.5 text-dim",
};

/** A collapsible block that shrinks to just its header (matches the report view). */
function CollapsibleSection({
  title,
  Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  Icon: typeof Rocket;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-rise overflow-hidden rounded-[11px] border border-line bg-panel2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-panel"
      >
        <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Icon size={15} className="text-brand" />
          {title}
        </span>
        {open ? (
          <ChevronDown size={16} className="shrink-0 text-mut" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-mut" />
        )}
      </button>
      {open && <div className="border-t border-line px-4 py-3.5">{children}</div>}
    </div>
  );
}

/**
 * Support tab: the support agent's inbox (existing), plus a Roadmap of what's
 * coming and Release notes of what's shipped. The dashboard already sits behind
 * auth, so a logged-in user is assumed here.
 */
export function SupportPanel({ topicId }: { topicId: string }) {
  const [roadmapOpen, setRoadmapOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);

  return (
    <div>
      {/* Existing support-agent inbox — untouched. */}
      <SectionPanel
        topicId={topicId}
        sectionKey="support"
        title="From the inbox"
        subtitle="Top customer questions and drafted replies for your review."
        emptyLabel="No customer questions yet — the support agent is standing by…"
      />

      <div className="space-y-3 px-4 pb-4">
        <CollapsibleSection
          title="Roadmap"
          Icon={Rocket}
          open={roadmapOpen}
          onToggle={() => setRoadmapOpen((o) => !o)}
        >
          <p className="mb-3 text-[12.5px] text-mut">
            What we&apos;re building next for your AI company.
          </p>
          <ul className="space-y-2">
            {ROADMAP.map((item) => (
              <li
                key={item.title}
                className="rounded-lg border border-line bg-panel px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-ink">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-snug text-mut">
                      {item.summary}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${ROADMAP_STATUS_CLS[item.status]}`}
                  >
                    {item.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection
          title="Release notes"
          Icon={Megaphone}
          open={notesOpen}
          onToggle={() => setNotesOpen((o) => !o)}
        >
          <p className="mb-3 text-[12.5px] text-mut">
            The latest improvements we&apos;ve shipped, newest first.
          </p>
          <ul className="space-y-2">
            {RELEASE_NOTES.map((note) => (
              <li
                key={note.title}
                className="rounded-lg border border-line bg-panel px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {note.title}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${RELEASE_TAG_CLS[note.tag]}`}
                      >
                        {note.tag}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-snug text-mut">
                      {note.summary}
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11.5px] text-dim">
                    {note.date}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Type or SPEAK a support note — drops onto the roadmap for Winslow. */}
        <ContextDropInput topicId={topicId} area="Support" />
      </div>
    </div>
  );
}
