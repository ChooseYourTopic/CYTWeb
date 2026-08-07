"use client";

import { useState } from "react";
import {
  Briefcase,
  Map as MapIcon,
  LineChart,
  Megaphone,
  PenTool,
  Award,
  Check,
  X,
  Lock,
  type LucideIcon,
} from "lucide-react";

/**
 * The plan as a board of clickable deliverables — like the Challenges board. Each
 * card opens its detail (what the plan covers) and is an achievement that earns a
 * badge for the topic once completed. Achieved state is local for now (the UI layer);
 * wiring it to persist / auto-earn from real progress is a backend follow-up.
 */
type PlanItem = {
  key: string;
  label: string;
  Icon: LucideIcon;
  badge: string;
  blurb: string;
  deliverables: string[];
};

const PLAN_ITEMS: PlanItem[] = [
  {
    key: "business",
    label: "Business plan",
    Icon: Briefcase,
    badge: "Strategist",
    blurb:
      "The core model — who it's for, why it wins, and how it makes money.",
    deliverables: [
      "Positioning & value proposition",
      "Target market & ideal customer",
      "Revenue model & pricing",
      "Key milestones",
    ],
  },
  {
    key: "roadmap",
    label: "Roadmap",
    Icon: MapIcon,
    badge: "Navigator",
    blurb: "The sequenced path from today to a running business.",
    deliverables: [
      "Phases & milestones",
      "Timeline & priorities",
      "Dependencies & risks",
    ],
  },
  {
    key: "financial",
    label: "Financial plan",
    Icon: LineChart,
    badge: "Treasurer",
    blurb: "The money — projections, costs, and the path to profit.",
    deliverables: [
      "Revenue projections",
      "Cost model & budget",
      "Runway & unit economics",
    ],
  },
  {
    key: "social",
    label: "Social media plan",
    Icon: Megaphone,
    badge: "Amplifier",
    blurb: "How the brand shows up and grows an audience.",
    deliverables: [
      "Channel mix",
      "Posting cadence",
      "Growth & engagement tactics",
    ],
  },
  {
    key: "content",
    label: "Content creation plan",
    Icon: PenTool,
    badge: "Creator",
    blurb: "The content engine that fuels every channel.",
    deliverables: ["Content pillars", "Editorial calendar", "Formats & SEO"],
  },
];

export function PlanBoard({ summary }: { summary?: string }) {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<PlanItem | null>(null);

  return (
    <div>
      {summary && (
        <p className="mb-3 text-[14px] leading-relaxed text-ink/90">{summary}</p>
      )}
      <p className="mb-2 text-[12.5px] text-mut">
        Each plan is a challenge — open it to see what it covers, and earn its badge
        when it&apos;s complete.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {PLAN_ITEMS.map((p) => {
          const done = earned.has(p.key);
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
              {/* badge state */}
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
                <p.Icon size={20} />
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
      </div>

      {/* Detail — mirrors the challenge more-info modal */}
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
                    earned.has(active.key)
                      ? "border-[#7a5c14] bg-[#221a06] text-[#f0c245]"
                      : "border-line bg-panel2 text-brand"
                  }`}
                >
                  <active.Icon size={20} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">
                    {active.label}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#f0c245]">
                    <Award size={12} /> Earns the {active.badge} badge
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
              {active.blurb}
            </p>

            <div className="mt-3">
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-dim">
                What it delivers
              </div>
              <ul className="space-y-1.5">
                {active.deliverables.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-ink/90"
                  >
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() =>
                setEarned((prev) => {
                  const next = new Set(prev);
                  if (next.has(active.key)) next.delete(active.key);
                  else next.add(active.key);
                  return next;
                })
              }
              className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold ${
                earned.has(active.key)
                  ? "border border-line bg-panel2 text-mut"
                  : "cyt-gradient-bg text-bg"
              }`}
            >
              {earned.has(active.key) ? (
                <>Achieved · tap to undo</>
              ) : (
                <>
                  <Check size={14} /> Mark achieved — earn the {active.badge} badge
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
