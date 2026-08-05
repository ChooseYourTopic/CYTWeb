"use client";

import { useEffect, useState } from "react";
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
  CheckSquare,
  Square,
  Gauge,
} from "lucide-react";
import { Sparkline } from "@/components/research/Sparkline";
import {
  cytapi,
  ApiError,
  type TopicOverview,
  type TopicGoals,
} from "@/lib/api";

/**
 * Effort presets. Each sets the project's daily spend cap and kicks off work —
 * the bigger the push, the higher the budget you let the agent team work within.
 */
type Tier = {
  key: string;
  label: string;
  Icon: typeof Zap;
  blurb: string;
  capUsd: number;
};

const TIERS: Tier[] = [
  {
    key: "quick",
    label: "Something quick",
    Icon: Zap,
    blurb: "A fast, focused pass — a tight budget to nudge the project forward.",
    capUsd: 5,
  },
  {
    key: "couple",
    label: "Got a couple minutes",
    Icon: Clock,
    blurb: "A short burst across a couple of agents.",
    capUsd: 20,
  },
  {
    key: "more",
    label: "Got a little more",
    Icon: Coffee,
    blurb: "A deeper dive across the core team.",
    capUsd: 50,
  },
  {
    key: "mission",
    label: "I'm on a mission",
    Icon: Rocket,
    blurb: "A full push — the whole crew works the project within a larger budget.",
    capUsd: 150,
  },
];

// Report sections, top to bottom.
const SECTION_ORDER = [
  "decided",
  "next_steps",
  "achievements",
  "value_prop",
  "plan",
  "goals",
];

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
              <span className="text-[13px] text-mut">Daily spend cap</span>
              <span className="text-[15px] font-bold text-ink">
                ${tier.capUsd}/day
              </span>
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              Your agents work within this cap — they never spend more than this
              per day on the project.
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
  const execSummary = overview?.exec_summary;
  const projectName = overview?.topic || "your project";
  const nextSteps = overview?.recommended_next_steps ?? [];
  const achievements = overview?.recent_achievements ?? [];

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

  // Accelerate-now (invoke orchestrator) menu state.
  const [accelOpen, setAccelOpen] = useState(false);
  const [accelBusy, setAccelBusy] = useState(false);
  const [accelMsg, setAccelMsg] = useState<string | null>(null);

  // Interactive per-topic goals (daily/weekly/monthly momentum steps).
  const [goalGroups, setGoalGroups] = useState<TopicGoals | null>(null);
  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    cytapi
      .topicGoals(topicId)
      .then((r) => {
        if (!cancelled) setGoalGroups(r.goals);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  function flip(groups: TopicGoals, cadence: keyof TopicGoals, goalId: number) {
    return {
      ...groups,
      [cadence]: groups[cadence].map((g) =>
        g.id === goalId ? { ...g, done: !g.done } : g,
      ),
    };
  }

  async function toggleGoal(cadence: keyof TopicGoals, goalId: number) {
    if (!topicId) return;
    setGoalGroups((prev) => (prev ? flip(prev, cadence, goalId) : prev)); // optimistic
    try {
      await cytapi.toggleTopicGoal(topicId, goalId);
    } catch {
      setGoalGroups((prev) => (prev ? flip(prev, cadence, goalId) : prev)); // revert
    }
  }

  async function invokeOrchestrator(intent: "run" | "plan" | "review") {
    if (!topicId || accelBusy) return;
    setAccelBusy(true);
    setAccelMsg(null);
    try {
      await cytapi.agentTrigger("orchestrator", topicId);
      setAccelMsg(
        intent === "plan"
          ? "Orchestrator invoked — re-planning the project."
          : intent === "review"
            ? "Orchestrator invoked — reviewing progress."
            : "Orchestrator invoked — accelerating now.",
      );
      setAccelOpen(false);
    } catch {
      setAccelMsg("Couldn't invoke the orchestrator. Please try again.");
    } finally {
      setAccelBusy(false);
    }
  }

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
      // Set the project's daily spend cap, then activate work (orchestrator
      // plans + delegates within that cap).
      if (pendingTier) {
        await cytapi.setTopicSpendCap(topicId, pendingTier.capUsd);
      }
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
      {/* Effort presets — each activates a task (confirmed in a cost modal).
          "Accelerate now" (to the left) invokes the orchestrator directly. */}
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <div className="relative mr-auto">
          <button
            type="button"
            onClick={() => setAccelOpen((o) => !o)}
            disabled={accelBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1f3d2e] bg-[#0e1c16] px-2.5 py-1.5 text-[12px] font-semibold text-good transition-colors hover:brightness-125 disabled:opacity-60"
          >
            {accelBusy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Gauge size={13} />
            )}
            Accelerate now
            <ChevronDown size={12} />
          </button>
          {accelOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
              <div className="border-b border-line px-3 py-2 text-[11px] uppercase tracking-wide text-dim">
                Invoke the orchestrator
              </div>
              <button
                type="button"
                onClick={() => invokeOrchestrator("run")}
                className="block w-full px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-panel2"
              >
                Run the orchestrator now
              </button>
              <button
                type="button"
                onClick={() => invokeOrchestrator("plan")}
                className="block w-full px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-panel2"
              >
                Re-plan the project
              </button>
              <button
                type="button"
                onClick={() => invokeOrchestrator("review")}
                className="block w-full px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-panel2"
              >
                Review &amp; prioritize
              </button>
            </div>
          )}
          {accelMsg && (
            <div className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11.5px] text-good">
              {accelMsg}
            </div>
          )}
        </div>
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

      <CollapsibleSection
        title="Recommended next steps"
        open={isOpen("next_steps")}
        onToggle={() => toggle("next_steps")}
      >
        {nextSteps.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink/90">
            {nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-dim">
            No recommended steps yet — the team is still planning.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Recent achievements"
        open={isOpen("achievements")}
        onToggle={() => toggle("achievements")}
      >
        {achievements.length > 0 ? (
          <ul className="space-y-1.5 text-[14px] text-ink/90">
            {achievements.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-good" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-dim">
            No completed work yet — achievements appear here as tasks finish.
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

      <CollapsibleSection
        title="Goals"
        open={isOpen("goals")}
        onToggle={() => toggle("goals")}
      >
        <p className="mb-3 text-[12.5px] text-mut">
          Small steps to keep {projectName} moving — check them off as you go.
        </p>
        {(["daily", "weekly", "monthly"] as const).map((cadence) => {
          const list = goalGroups?.[cadence] ?? [];
          return (
            <div key={cadence} className="mb-3 last:mb-0">
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-dim">
                {cadence}
              </div>
              {list.length > 0 ? (
                <ul className="space-y-1">
                  {list.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => toggleGoal(cadence, g.id)}
                        className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-panel"
                      >
                        {g.done ? (
                          <CheckSquare
                            size={16}
                            className="mt-0.5 shrink-0 text-good"
                          />
                        ) : (
                          <Square size={16} className="mt-0.5 shrink-0 text-mut" />
                        )}
                        <span
                          className={`text-[14px] ${g.done ? "text-dim line-through" : "text-ink/90"}`}
                        >
                          {g.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-dim">
                  {goalGroups ? "No steps this period." : "Loading…"}
                </p>
              )}
            </div>
          );
        })}
      </CollapsibleSection>

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
