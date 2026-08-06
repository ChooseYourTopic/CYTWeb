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
  Bot,
  Wrench,
  MessageSquare,
  Repeat,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { CueWinslow } from "@/components/research/CueWinslow";
import { AGENT_DISPLAY_NAMES } from "@/lib/utils";
import {
  cytapi,
  ApiError,
  type TopicOverview,
  type TopicGoals,
  type TopicGoal,
  type RecommendedStep,
  type TopicActivity,
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

/** "social_media" -> "Social Media" for display (orchestrator -> "Winslow"). */
function prettyAgent(name: string): string {
  if (AGENT_DISPLAY_NAMES[name]) return AGENT_DISPLAY_NAMES[name];
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The always-alive signal: tells the user whether the crew is working, work is
 * queued and waiting on an agent, the project is idle, or nothing has ever run
 * (a gentle stall hint that points at how to kick it off). Without this a blank
 * dashboard is indistinguishable from a broken one.
 */
function WorkStateBanner({ activity }: { activity?: TopicActivity }) {
  const state = activity?.state ?? "idle";
  const pending = activity?.pending ?? 0;
  const running = activity?.running ?? 0;
  const activeAgents = activity?.active_agents ?? 0;

  const parts: string[] = [];
  if (activeAgents > 0)
    parts.push(`${activeAgents} agent${activeAgents === 1 ? "" : "s"} active`);
  if (running > 0) parts.push(`${running} in progress`);
  if (pending > 0) parts.push(`${pending} queued`);
  const detail = parts.join(" · ");

  const config = {
    working: {
      cls: "border-[#1f3d2e] bg-[#0e1c16] text-good",
      icon: <Loader2 size={16} className="animate-spin text-good" />,
      title: "Your crew is on it",
      body: detail || "Agents are working this project right now.",
    },
    queued: {
      cls: "border-[#3a3320] bg-[#1a1608] text-warn",
      icon: <Clock size={16} className="text-warn" />,
      title: "Work queued — waiting on an agent",
      body:
        (detail ? `${detail}. ` : "") +
        "Tasks are lined up and will start as an agent frees up.",
    },
    stalled: {
      cls: "border-line bg-panel2 text-mut",
      icon: <Rocket size={16} className="text-brand" />,
      title: "Nothing has run yet",
      body:
        "Your team is standing by. Pick an effort level above, or hit " +
        "“Accelerate now,” to get the crew started on this project.",
    },
    idle: {
      cls: "border-line bg-panel2 text-mut",
      icon: <CheckCircle2 size={16} className="text-good" />,
      title: "All caught up — nothing running right now",
      body:
        "No work is in flight. Give the team a new direction or accelerate to " +
        "push the project forward.",
    },
  }[state];

  return (
    <div
      className={`animate-rise flex items-start gap-2.5 rounded-[11px] border px-3.5 py-2.5 ${config.cls}`}
    >
      <span className="mt-0.5 shrink-0">{config.icon}</span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{config.title}</div>
        <div className="mt-0.5 text-[12.5px] text-mut">{config.body}</div>
      </div>
    </div>
  );
}

/**
 * A recommended next step rendered as a first-class action: human title, the
 * why, the owning agent + expected artifact, and a one-click CTA that triggers
 * the owning agent. Never shows a raw system-trigger label.
 */
function NextStepCard({
  step,
  topicId,
}: {
  step: RecommendedStep;
  topicId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const owner = step.owner_role || (step.owner ? prettyAgent(step.owner) : null);
  const runnable = Boolean(topicId && step.agent_type);

  async function run() {
    if (!runnable || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await cytapi.agentTrigger(step.agent_type as string, topicId as string);
      setMsg(r.message ?? `Sent to ${prettyAgent(step.agent_type as string)}.`);
    } catch {
      setMsg("Couldn't start that — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-ink">{step.title}</div>
          {step.why ? (
            <div className="mt-0.5 text-[12.5px] leading-snug text-mut">
              {step.why}
            </div>
          ) : null}
        </div>
        {runnable ? (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#1f3d2e] bg-[#0e1c16] px-2.5 py-1.5 text-[11.5px] font-semibold text-good transition-colors hover:brightness-125 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
            {step.cta ?? "Run"}
          </button>
        ) : null}
      </div>
      {(owner || step.artifact) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {owner ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11px] text-mut">
              <Bot size={11} className="text-brand" />
              {owner}
            </span>
          ) : null}
          {step.artifact ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11px] text-mut">
              <Wrench size={11} className="text-brand" />
              {step.artifact}
            </span>
          ) : null}
        </div>
      )}
      {msg ? (
        <p className="mt-2 rounded-md border border-[#1f3d2e] bg-[#0e1c16] px-2 py-1 text-[11.5px] text-good">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

/**
 * How-to modal for a goal: the agents, skills, prompts, and loops that help
 * complete this step, plus a way to mark it done.
 */
function GoalGuideModal({
  goal,
  topicId,
  onClose,
  onToggleDone,
}: {
  goal: TopicGoal;
  topicId?: string;
  onClose: () => void;
  onToggleDone: () => void;
}) {
  const guide = goal.guide;
  const primaryAgent = guide?.agents?.[0];
  const [copied, setCopied] = useState<number | null>(null);
  const [runningPrompt, setRunningPrompt] = useState<number | null>(null);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [takeInput, setTakeInput] = useState("");
  const [taking, setTaking] = useState(false);

  async function copyPrompt(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  async function runPrompt(text: string, i: number) {
    if (!topicId || !primaryAgent || runningPrompt !== null) return;
    setRunningPrompt(i);
    setRunMsg(null);
    try {
      const r = await cytapi.agentTrigger(primaryAgent, topicId, text);
      setRunMsg(r.message ?? `Sent to ${prettyAgent(primaryAgent)}.`);
    } catch {
      setRunMsg("Couldn't start that run — try again.");
    } finally {
      setRunningPrompt(null);
    }
  }

  async function triggerAgent(agentType: string) {
    if (!topicId) return;
    setRunMsg(null);
    try {
      const r = await cytapi.agentTrigger(agentType, topicId);
      setRunMsg(r.message ?? `Triggered ${prettyAgent(agentType)}.`);
    } catch {
      setRunMsg("Couldn't trigger that agent — try again.");
    }
  }

  async function takeOn() {
    if (!topicId || !primaryAgent || !takeInput.trim() || taking) return;
    setTaking(true);
    setRunMsg(null);
    try {
      const r = await cytapi.agentTrigger(primaryAgent, topicId, takeInput.trim());
      setRunMsg(r.message ?? `Sent to ${prettyAgent(primaryAgent)} — making progress.`);
      setTakeInput("");
    } catch {
      setRunMsg("Couldn't send that — try again.");
    } finally {
      setTaking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[16px] font-bold leading-snug text-ink">
            {goal.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-mut transition-colors hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-[12.5px] text-mut">
          Take on this challenge — give your team context or a direction to make
          progress, or run an action below.
        </p>

        <div className="mt-4 rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <Send size={14} className="text-brand" /> Take it on
          </div>
          <p className="mb-2 text-[12px] text-mut">
            Add context, a direction, or an action and send it to{" "}
            {primaryAgent ? prettyAgent(primaryAgent) : "your team"} to move this
            forward.
          </p>
          <textarea
            value={takeInput}
            onChange={(e) => setTakeInput(e.target.value)}
            rows={3}
            placeholder="e.g. focus on the budget-conscious buyer, or: draft 3 launch posts…"
            className="cyt-input w-full resize-y text-[13px]"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={takeOn}
              disabled={!topicId || !primaryAgent || !takeInput.trim() || taking}
              className="cyt-gradient-bg inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-bold text-bg disabled:opacity-50"
            >
              {taking ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Take it on
            </button>
          </div>
        </div>

        {guide?.agents?.length ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Bot size={14} className="text-brand" /> Agents
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guide.agents.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => triggerAgent(a)}
                  disabled={!topicId}
                  title={topicId ? `Trigger ${prettyAgent(a)} for this topic` : undefined}
                  className="rounded-lg border border-line bg-panel2 px-2 py-1 text-[12px] text-mut transition-colors hover:border-[#31384c] hover:text-ink disabled:cursor-default disabled:hover:border-line disabled:hover:text-mut"
                >
                  {prettyAgent(a)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {guide?.skills?.length ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Wrench size={14} className="text-brand" /> Skills
            </div>
            <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-ink/90">
              {guide.skills.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {guide?.prompts?.length ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px] font-semibold text-ink">
              <span className="flex items-center gap-1.5">
                <MessageSquare size={14} className="text-brand" /> Prompts to try
              </span>
              {primaryAgent ? (
                <span className="text-[11px] font-normal text-dim">
                  runs on {prettyAgent(primaryAgent)}
                </span>
              ) : null}
            </div>
            <div className="space-y-1.5">
              {guide.prompts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-line bg-panel2 px-3 py-2"
                >
                  <span className="flex-1 text-[13px] text-ink/90">{p}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyPrompt(p, i)}
                      aria-label="Copy prompt"
                      className="text-mut transition-colors hover:text-ink"
                    >
                      {copied === i ? (
                        <Check size={14} className="text-good" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => runPrompt(p, i)}
                      disabled={!topicId || !primaryAgent || runningPrompt !== null}
                      className="inline-flex items-center gap-1 rounded-md border border-[#1f3d2e] bg-[#0e1c16] px-2 py-1 text-[11.5px] font-semibold text-good transition-colors hover:brightness-125 disabled:opacity-50"
                    >
                      {runningPrompt === i ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {guide?.loops?.length ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Repeat size={14} className="text-brand" /> Loops
            </div>
            <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-ink/90">
              {guide.loops.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {runMsg && (
          <p className="mt-4 rounded-lg border border-[#1f3d2e] bg-[#0e1c16] px-3 py-2 text-[12.5px] text-good">
            {runMsg}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleDone}
            className="rounded-xl border border-line bg-panel2 px-4 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:border-[#31384c]"
          >
            {goal.done ? "Mark not done" : "Mark done"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cyt-gradient-bg rounded-xl px-4 py-2 text-[13.5px] font-bold text-bg"
          >
            Close
          </button>
        </div>
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
  const [activeGoal, setActiveGoal] = useState<{
    cadence: keyof TopicGoals;
    goal: TopicGoal;
  } | null>(null);
  // Transient XP celebration toast fired off a challenge toggle's battle-pass delta.
  const [xpToast, setXpToast] = useState<string | null>(null);
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
      const r = await cytapi.toggleTopicGoal(topicId, goalId);
      const delta = r.battlepass?.xp_delta ?? 0;
      if (delta > 0) {
        setXpToast(
          r.battlepass.season_finished
            ? `+${delta} XP · Season cleared! 👑`
            : r.battlepass.tier_up
              ? `+${delta} XP · Tier up! 🎉`
              : `+${delta} XP 🔥`,
        );
      } else if (delta < 0) {
        setXpToast(`${delta} XP`);
      }
      if (delta !== 0) window.setTimeout(() => setXpToast(null), 2500);
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
          ? "Winslow invoked — re-planning the project."
          : intent === "review"
            ? "Winslow invoked — reviewing progress."
            : "Winslow invoked — accelerating now.",
      );
      setAccelOpen(false);
    } catch {
      setAccelMsg("Couldn't invoke Winslow. Please try again.");
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
                Invoke Winslow
              </div>
              <button
                type="button"
                onClick={() => invokeOrchestrator("run")}
                className="block w-full px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-panel2"
              >
                Run Winslow now
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

      {/* Always-alive signal: queued / working / stalled / idle. */}
      <WorkStateBanner activity={overview?.activity} />

      <CollapsibleSection
        title="Cue Winslow"
        open={isOpen("decided")}
        onToggle={() => toggle("decided")}
      >
        <CueWinslow topicId={topicId} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Recommended next steps"
        open={isOpen("next_steps")}
        onToggle={() => toggle("next_steps")}
      >
        {nextSteps.length > 0 ? (
          <div className="space-y-1.5">
            {nextSteps.map((s, i) => (
              <NextStepCard key={s.id ?? i} step={s} topicId={topicId} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-dim">
            {overview?.activity?.state === "stalled"
              ? "No steps yet — kick off the crew above and the team will plan your next moves."
              : "No recommended steps yet — the team is still planning."}
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
        title="Challenges"
        open={isOpen("goals")}
        onToggle={() => toggle("goals")}
      >
        <p className="mb-3 text-[12.5px] text-mut">
          Clear challenges to keep {projectName} moving and earn XP toward your
          Battle Pass — check them off as you go.
        </p>
        {(["daily", "weekly", "monthly"] as const).map((cadence) => {
          const list = goalGroups?.[cadence] ?? [];
          return (
            <div key={cadence} className="mb-3 last:mb-0">
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-dim">
                {cadence} challenge
              </div>
              {list.length > 0 ? (
                <ul className="space-y-1.5">
                  {list.map((g, i) => (
                    <li
                      key={g.id}
                      className="flex items-center gap-2.5 rounded-lg border border-line bg-panel2 px-2.5 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGoal(cadence, g.id)}
                        aria-label={g.done ? "Mark not done" : "Mark done"}
                        className="shrink-0"
                      >
                        {g.done ? (
                          <CheckSquare size={16} className="text-good" />
                        ) : (
                          <Square size={16} className="text-mut" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveGoal({ cadence, goal: g })}
                        className="group flex flex-1 items-center justify-between gap-2 text-left"
                      >
                        <span
                          className={`text-[13.5px] font-medium ${g.done ? "text-dim line-through" : "text-ink/90"}`}
                        >
                          Challenge {i + 1}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[11.5px] font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                          View →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-dim">
                  {goalGroups ? "No challenges this period." : "Loading…"}
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

      {xpToast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-rise rounded-full border border-brand/50 bg-brand/15 px-5 py-2.5 text-[14px] font-bold text-brand shadow-xl">
          {xpToast}
        </div>
      )}

      {activeGoal && (
        <GoalGuideModal
          goal={activeGoal.goal}
          topicId={topicId}
          onClose={() => setActiveGoal(null)}
          onToggleDone={() => {
            toggleGoal(activeGoal.cadence, activeGoal.goal.id);
            setActiveGoal((prev) =>
              prev
                ? { ...prev, goal: { ...prev.goal, done: !prev.goal.done } }
                : prev,
            );
          }}
        />
      )}
    </div>
  );
}
