"use client";

import { useEffect, useState } from "react";
import {
  X,
  Send,
  Loader2,
  Bot,
  Wrench,
  MessageSquare,
  Check,
  Copy,
  Repeat,
} from "lucide-react";
import { cytapi, type TopicGoals, type TopicGoal } from "@/lib/api";
import { ChestIcon } from "@/components/research/Chest";
import { iconFor, frameFor } from "@/components/research/challengeIcons";
import { AGENT_DISPLAY_NAMES } from "@/lib/utils";

function prettyAgent(name: string): string {
  if (AGENT_DISPLAY_NAMES[name]) return AGENT_DISPLAY_NAMES[name];
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * How-to modal for a challenge: the agents, skills, prompts, and loops that help
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
          <h3 className="text-[16px] font-bold leading-snug text-ink">{goal.title}</h3>
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
              {taking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
 * The challenge board: three ranks (daily / weekly / monthly), each a row of
 * treasure chests laid left → right. A chest opens its more-info play. Shared by the
 * Overview tab and the Impact Pass tab. Self-contained: fetches goals, toggles done,
 * and fires the XP celebration.
 */
export function ChallengeBoard({
  topicId,
  projectName,
}: {
  topicId?: string;
  projectName?: string;
}) {
  const [goalGroups, setGoalGroups] = useState<TopicGoals | null>(null);
  const [activeGoal, setActiveGoal] = useState<{
    cadence: keyof TopicGoals;
    goal: TopicGoal;
  } | null>(null);
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

  return (
    <div>
      <p className="mb-3 text-[12.5px] text-mut">
        Open a chest to see the play — clear challenges to keep{" "}
        {projectName ?? "your project"} moving and earn XP toward your Impact Pass.
      </p>

      <div className="overflow-hidden rounded-2xl border border-[#3a3016] bg-gradient-to-b from-[#12100a] to-[#0c0a06] p-2 shadow-[inset_0_1px_0_rgba(240,194,69,0.08)]">
        {(["daily", "weekly", "monthly"] as const).map((cadence, rowIdx) => {
          const list = goalGroups?.[cadence] ?? [];
          return (
            <div
              key={cadence}
              className={`flex items-center gap-3 rounded-xl px-2 py-2.5 ${
                rowIdx % 2 ? "bg-white/[0.015]" : ""
              } ${rowIdx > 0 ? "mt-1 border-t border-[#241d0e]" : ""}`}
            >
              <div className="w-[64px] shrink-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#e6c25a]">
                  {cadence}
                </div>
                <div className="text-[10px] text-dim">
                  {list.length} chest{list.length === 1 ? "" : "s"}
                </div>
              </div>

              {list.length > 0 ? (
                <div className="flex flex-1 flex-wrap items-start gap-2.5">
                  {list.map((g, i) => {
                    const frame = frameFor(g.difficulty);
                    const RIcon = iconFor(g.icon);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveGoal({ cadence, goal: g })}
                        title={`Challenge ${i + 1}${g.difficulty ? ` · ${frame.label}` : ""} — open`}
                        className={`group relative flex w-[90px] shrink-0 flex-col items-center gap-1 rounded-xl border ${frame.border} bg-panel2/60 px-2 py-2 transition-all hover:-translate-y-0.5 hover:bg-panel2 hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.7)]`}
                      >
                        <span
                          className={`absolute right-1 top-1 rounded px-1 text-[8.5px] font-bold uppercase tracking-wide ${frame.chip}`}
                          title={frame.label}
                        >
                          {frame.label[0]}
                        </span>
                        {g.done && (
                          <Check size={12} className="absolute left-1 top-1 text-good" />
                        )}

                        <ChestIcon open={g.done} difficulty={g.difficulty} size={44} />

                        <span
                          className={`text-[11.5px] font-semibold leading-none ${
                            g.done ? "text-dim" : "text-ink/90"
                          }`}
                        >
                          Challenge {i + 1}
                        </span>

                        <span className="inline-flex items-center gap-0.5 text-[10px] text-mut">
                          <RIcon size={10} className={frame.text} />
                          {g.points != null ? `${g.points} XP` : "reward"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="flex-1 text-[12.5px] text-dim">
                  {goalGroups ? "No chests this period." : "Loading…"}
                </p>
              )}
            </div>
          );
        })}
      </div>

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
              prev ? { ...prev, goal: { ...prev.goal, done: !prev.goal.done } } : prev,
            );
          }}
        />
      )}
    </div>
  );
}
