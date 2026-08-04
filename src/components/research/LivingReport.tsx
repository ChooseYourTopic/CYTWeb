"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  Coffee,
  Rocket,
} from "lucide-react";
import { Sparkline } from "@/components/research/Sparkline";
import type { TopicOverview } from "@/lib/api";

/** Time-commitment presets — each expands progressively more of the report. */
type Depth = "quick" | "couple" | "more" | "mission";

const DEPTH_BUTTONS: { key: Depth; label: string; Icon: typeof Zap }[] = [
  { key: "quick", label: "Something quick", Icon: Zap },
  { key: "couple", label: "Got a couple minutes", Icon: Clock },
  { key: "more", label: "Got a little more", Icon: Coffee },
  { key: "mission", label: "I'm on a mission", Icon: Rocket },
];

// Report sections, top to bottom. A depth preset opens the first N of these.
const SECTION_ORDER = ["decided", "value_prop", "plan", "goals"] as const;

const DEPTH_OPEN_COUNT: Record<Depth, number> = {
  quick: 1,
  couple: 2,
  more: 3,
  mission: 4,
};

function openSetForDepth(d: Depth): Set<string> {
  return new Set(SECTION_ORDER.slice(0, DEPTH_OPEN_COUNT[d]));
}

/** A report section that collapses to just its header. */
function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
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
        <span className="text-[14px] font-semibold text-ink">{title}</span>
        {open ? (
          <ChevronDown size={16} className="shrink-0 text-mut" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-mut" />
        )}
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3.5">{children}</div>
      )}
    </div>
  );
}

/**
 * Overview tab — the "living report": time-commitment presets up top, then the
 * highest-level decisions as individually collapsible sections. Fills in live.
 */
export function LivingReport({
  overview,
}: {
  overview: TopicOverview | null;
  loading?: boolean;
}) {
  const items = overview?.items ?? [];
  const valueProp = items.find((i) => i.id === "value-prop");
  const plan = items.find((i) => i.id === "plan");
  const goals = items.filter(
    (i) => typeof i.id === "string" && i.id.startsWith("ov-goal-"),
  );
  const execSummary = overview?.exec_summary;

  const [depth, setDepth] = useState<Depth>("couple");
  const [openSet, setOpenSet] = useState<Set<string>>(openSetForDepth("couple"));

  function applyDepth(d: Depth) {
    setDepth(d);
    setOpenSet(openSetForDepth(d));
  }
  function toggle(key: string) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  const isOpen = (k: string) => openSet.has(k);

  return (
    <div className="space-y-3 p-4">
      {/* Time-commitment presets — how much of the report to reveal. */}
      <div className="flex flex-wrap justify-end gap-1.5">
        {DEPTH_BUTTONS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => applyDepth(b.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
              depth === b.key
                ? "border-[#31384c] bg-panel2 text-ink"
                : "border-line text-mut hover:text-ink"
            }`}
          >
            <b.Icon size={13} />
            {b.label}
          </button>
        ))}
      </div>

      <CollapsibleSection
        title="What the team decided"
        open={isOpen("decided")}
        onToggle={() => toggle("decided")}
      >
        {execSummary ? (
          <>
            <p className="text-[14px] leading-relaxed text-ink/90">
              {execSummary}
            </p>
            {overview?.spark && overview.spark.length > 0 && (
              <div className="mt-3.5">
                <div className="mb-2 text-[12px] uppercase tracking-wide text-mut">
                  Momentum
                </div>
                <Sparkline data={overview.spark} />
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-dim">
            Writing your report… agents are researching.
          </p>
        )}
      </CollapsibleSection>

      {valueProp && (
        <CollapsibleSection
          title="Value proposition"
          open={isOpen("value_prop")}
          onToggle={() => toggle("value_prop")}
        >
          <p className="text-[14px] leading-relaxed text-ink/90">
            {valueProp.summary}
          </p>
        </CollapsibleSection>
      )}

      {plan && (
        <CollapsibleSection
          title="The plan"
          open={isOpen("plan")}
          onToggle={() => toggle("plan")}
        >
          <p className="text-[14px] leading-relaxed text-ink/90">
            {plan.summary}
          </p>
        </CollapsibleSection>
      )}

      {goals.length > 0 && (
        <CollapsibleSection
          title={goals.length > 1 ? "Goals" : "Goal"}
          open={isOpen("goals")}
          onToggle={() => toggle("goals")}
        >
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink/90">
            {goals.map((g) => (
              <li key={g.id}>{g.summary}</li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
