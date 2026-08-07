"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Map as MapIcon,
  LineChart,
  Megaphone,
  PenTool,
  Award,
  X,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cytapi, type PlanAchievementItem } from "@/lib/api";

/**
 * The plan as a board of clickable deliverables — like the Challenges board. Each
 * card opens its detail and is an achievement that earns a badge for the topic.
 * Badges AUTO-EARN from real agent progress and persist (GET /me/topics/{id}/plan);
 * this component only renders that state.
 */

/** UI catalog — icon + copy per plan key. Earned state comes from the API. */
const UI: Record<
  string,
  { Icon: LucideIcon; blurb: string; earnedBy: string; deliverables: string[] }
> = {
  business: {
    Icon: Briefcase,
    blurb: "The core model — who it's for, why it wins, and how it makes money.",
    earnedBy: "your business planner",
    deliverables: [
      "Positioning & value proposition",
      "Target market & ideal customer",
      "Revenue model & pricing",
      "Key milestones",
    ],
  },
  roadmap: {
    Icon: MapIcon,
    blurb: "The sequenced path from today to a running business.",
    earnedBy: "your planner / orchestrator",
    deliverables: ["Phases & milestones", "Timeline & priorities", "Dependencies & risks"],
  },
  financial: {
    Icon: LineChart,
    blurb: "The money — projections, costs, and the path to profit.",
    earnedBy: "your finance agent",
    deliverables: ["Revenue projections", "Cost model & budget", "Runway & unit economics"],
  },
  social: {
    Icon: Megaphone,
    blurb: "How the brand shows up and grows an audience.",
    earnedBy: "your social media agent",
    deliverables: ["Channel mix", "Posting cadence", "Growth & engagement tactics"],
  },
  content: {
    Icon: PenTool,
    blurb: "The content engine that fuels every channel.",
    earnedBy: "your content agents",
    deliverables: ["Content pillars", "Editorial calendar", "Formats & SEO"],
  },
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

export function PlanBoard({ topicId, summary }: { topicId?: string; summary?: string }) {
  const [plans, setPlans] = useState<PlanAchievementItem[] | null>(null);
  const [active, setActive] = useState<PlanAchievementItem | null>(null);

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    cytapi
      .topicPlan(topicId)
      .then((r) => {
        if (!cancelled) setPlans(r.plans);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const list = plans ?? [];

  return (
    <div>
      {summary && (
        <p className="mb-3 text-[14px] leading-relaxed text-ink/90">{summary}</p>
      )}
      <p className="mb-2 text-[12.5px] text-mut">
        Each plan is a challenge — open it to see what it covers. Its badge is earned
        automatically once your crew completes that plan.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {list.map((p) => {
          const ui = UI[p.key];
          const Icon = ui?.Icon ?? Briefcase;
          const done = p.achieved;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActive(p)}
              title={`${p.label} — open`}
              className={`group relative flex w-[132px] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2.5 py-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.7)] ${
                done
                  ? "border-[#7a5c14] bg-[#1a1408]"
                  : "border-line bg-panel2/60 hover:bg-panel2"
              }`}
            >
              <span
                className={`absolute right-1.5 top-1.5 ${done ? "text-[#f0c245]" : "text-dim"}`}
                title={done ? `${p.badge} badge earned` : "Badge locked"}
              >
                {done ? <Award size={14} /> : <Lock size={11} />}
              </span>
              <span
                className={`grid h-10 w-10 place-items-center rounded-lg border ${
                  done
                    ? "border-[#7a5c14] bg-[#221a06] text-[#f0c245]"
                    : "border-line bg-panel text-brand"
                }`}
              >
                <Icon size={20} />
              </span>
              <span className="text-center text-[12px] font-semibold leading-tight text-ink/90">
                {p.label}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${done ? "text-[#f0c245]" : "text-dim"}`}
              >
                {done ? "Earned" : p.badge}
              </span>
            </button>
          );
        })}
        {plans === null && (
          <span className="px-1 py-3 text-[12.5px] text-dim">Loading the plan…</span>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(4,6,10,0.66)] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActive(null);
          }}
        >
          <div className="w-[min(440px,94vw)] rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-lg border ${
                    active.achieved
                      ? "border-[#7a5c14] bg-[#221a06] text-[#f0c245]"
                      : "border-line bg-panel2 text-brand"
                  }`}
                >
                  {(() => {
                    const Icon = UI[active.key]?.Icon ?? Briefcase;
                    return <Icon size={20} />;
                  })()}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{active.label}</h3>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#f0c245]">
                    <Award size={12} /> {active.badge} badge
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-lg p-1 text-mut hover:bg-panel2 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-3 text-[13.5px] leading-relaxed text-ink/90">
              {UI[active.key]?.blurb}
            </p>

            <div className="mt-3">
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-dim">
                What it delivers
              </div>
              <ul className="space-y-1.5">
                {(UI[active.key]?.deliverables ?? []).map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink/90">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Earned state — auto, from real agent progress */}
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${
                active.achieved
                  ? "border-[#7a5c14] bg-[#1a1408] font-semibold text-[#f0c245]"
                  : "border-line bg-panel2 text-mut"
              }`}
            >
              {active.achieved ? (
                <>
                  <Award size={14} /> {active.badge} badge earned
                  {fmtDate(active.achieved_at) ? ` · ${fmtDate(active.achieved_at)}` : ""}
                </>
              ) : (
                <>
                  <Lock size={12} /> Auto-earns when {UI[active.key]?.earnedBy ?? "your crew"}{" "}
                  completes this plan.
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
