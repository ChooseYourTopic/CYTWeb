"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  Coffee,
  Rocket,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { Sparkline } from "@/components/research/Sparkline";
import { cytapi, ApiError, type TopicOverview } from "@/lib/api";

/**
 * Effort presets. Each activates a task on the project; the bigger the push, the
 * more the agent team does — and the higher the estimated development cost.
 */
type Tier = {
  key: string;
  label: string;
  Icon: typeof Zap;
  blurb: string;
  estUsd: number;
};

const TIERS: Tier[] = [
  {
    key: "quick",
    label: "Something quick",
    Icon: Zap,
    blurb: "A fast, focused pass — one quick agent run to nudge the project forward.",
    estUsd: 0.25,
  },
  {
    key: "couple",
    label: "Got a couple minutes",
    Icon: Clock,
    blurb: "A short burst across a couple of agents.",
    estUsd: 1.0,
  },
  {
    key: "more",
    label: "Got a little more",
    Icon: Coffee,
    blurb: "A deeper dive across the core team.",
    estUsd: 3.0,
  },
  {
    key: "mission",
    label: "I'm on a mission",
    Icon: Rocket,
    blurb: "A full push — the whole crew works the project end to end.",
    estUsd: 10.0,
  },
];

// Report sections, top to bottom.
const SECTION_ORDER = ["decided", "value_prop", "plan", "goals"];

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

/** Confirmation modal: project + estimated development cost + proceed. */
function ActivateTaskModal({
  tier,
  projectName,
  onClose,
  onProceed,
  submitting,
  done,
  error,
}: {
  tier: Tier;
  projectName: string;
  onClose: () => void;
  onProceed: () => void;
  submitting: boolean;
  done: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl border border-line bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[16px] font-bold text-ink">
            <tier.Icon size={18} className="text-brand" />
            {tier.label}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-mut transition-colors hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="mt-5 flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 size={28} className="text-good" />
            <p className="text-[14px] text-ink">Work started on {projectName}.</p>
            <p className="text-[13px] text-mut">
              Watch the live investigation as your agents get to it.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[13px] text-mut">
              On <span className="text-ink">{projectName}</span>
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink/90">
              {tier.blurb}
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-panel2 px-4 py-3">
              <span className="text-[13px] text-mut">Estimated cost</span>
              <span className="text-[15px] font-bold text-ink">
                ~${tier.estUsd.toFixed(2)}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              An estimate — actual spend depends on the work and is capped by your
              daily budget.
            </p>

            {error && <p className="mt-3 text-[13px] text-bad">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-line bg-panel2 px-4 py-2 text-[14px] font-semibold text-mut transition-colors hover:text-ink disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onProceed}
                disabled={submitting}
                className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                Proceed
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Overview tab — the "living report": effort presets that activate work (each
 * confirmed in a cost modal), then the highest-level decisions as individually
 * collapsible sections.
 */
export function LivingReport({
  overview,
  topicId,
}: {
  overview: TopicOverview | null;
  topicId?: string;
  loading?: boolean;
}) {
  const items = overview?.items ?? [];
  const valueProp = items.find((i) => i.id === "value-prop");
  const plan = items.find((i) => i.id === "plan");
  const goals = items.filter(
    (i) => typeof i.id === "string" && i.id.startsWith("ov-goal-"),
  );
  const execSummary = overview?.exec_summary;
  const projectName = overview?.topic || "your project";

  // Sections are individually collapsible; all open by default.
  const [openSet, setOpenSet] = useState<Set<string>>(new Set(SECTION_ORDER));
  const toggle = (key: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const isOpen = (k: string) => openSet.has(k);

  // Effort modal state.
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openTier(tier: Tier) {
    setPendingTier(tier);
    setSubmitting(false);
    setDone(false);
    setError(null);
  }
  function closeModal() {
    setPendingTier(null);
  }
  async function proceed() {
    if (!topicId) {
      setError("No project in context.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Activate work on the project — the orchestrator plans + delegates.
      await cytapi.agentTrigger("orchestrator", topicId);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? "Couldn't start the work. Please try again."
          : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 p-4">
      {/* Effort presets — each activates a task (confirmed in a cost modal). */}
      <div className="flex flex-wrap justify-end gap-1.5">
        {TIERS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => openTier(t)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut transition-colors hover:border-[#31384c] hover:text-ink"
          >
            <t.Icon size={13} />
            {t.label}
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

      {pendingTier && (
        <ActivateTaskModal
          tier={pendingTier}
          projectName={projectName}
          onClose={closeModal}
          onProceed={proceed}
          submitting={submitting}
          done={done}
          error={error}
        />
      )}
    </div>
  );
}
