"use client";

import { useEffect, useState } from "react";
import { Lock, Trophy } from "lucide-react";
import { cytapi, type AchievementShelf, type AchievementBadge } from "@/lib/api";
import { iconFor } from "@/components/research/challengeIcons";

/**
 * The topic's trophy shelf — every badge the project can earn, in one place: plan
 * badges (from agent work) + milestone badges (from real business signals). Earned
 * badges light gold; still-locked ones sit dim so progress is visible. Read-only —
 * all state is persisted server-side and auto-earned.
 */
export function TrophyShelf({ topicId }: { topicId?: string }) {
  const [shelf, setShelf] = useState<AchievementShelf | null>(null);

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    cytapi
      .topicAchievements(topicId)
      .then((s) => {
        if (!cancelled) setShelf(s);
      })
      .catch(() => {
        if (!cancelled) setShelf({ earned: 0, total: 0, badges: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  if (!shelf) {
    return <p className="text-[12.5px] text-dim">Loading the shelf…</p>;
  }

  // Earned first, then locked — each group keeps its natural (plan → milestone) order.
  const badges = [...shelf.badges].sort(
    (a, b) => Number(b.achieved) - Number(a.achieved),
  );
  const pct = shelf.total > 0 ? (shelf.earned / shelf.total) * 100 : 0;

  return (
    <div>
      {/* Progress header */}
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7a5c14] bg-[#221a06] px-3 py-1 text-[12.5px] font-bold text-[#f0c245]">
          <Trophy size={14} /> {shelf.earned} / {shelf.total} earned
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7a5c14] to-[#f0c245] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {badges.map((b) => (
          <BadgeMedallion key={b.key} badge={b} />
        ))}
        {badges.length === 0 && (
          <p className="text-[12.5px] text-dim">
            No badges yet — they appear here as your crew hits milestones.
          </p>
        )}
      </div>
    </div>
  );
}

function BadgeMedallion({ badge }: { badge: AchievementBadge }) {
  const Icon = iconFor(badge.icon);
  const done = badge.achieved;
  return (
    <div
      title={
        done
          ? `${badge.title} — earned${badge.detail ? ` · ${badge.detail}` : ""}`
          : `${badge.title} — locked`
      }
      className={`relative flex w-[92px] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 ${
        done
          ? "border-[#7a5c14] bg-[#1a1408]"
          : "border-line bg-panel2/50 opacity-70"
      }`}
    >
      {!done && (
        <Lock size={10} className="absolute right-1.5 top-1.5 text-dim" />
      )}
      <span
        className={`grid h-11 w-11 place-items-center rounded-full border-2 ${
          done
            ? "border-[#7a5c14] bg-[#221a06] text-[#f0c245] shadow-[0_0_12px_-2px_rgba(240,194,69,0.35)]"
            : "border-line bg-panel text-dim"
        }`}
      >
        <Icon size={20} />
      </span>
      <span
        className={`text-center text-[11px] font-semibold leading-tight ${done ? "text-ink/90" : "text-mut"}`}
      >
        {badge.title}
      </span>
      <span className="text-center text-[9.5px] uppercase tracking-wide text-dim">
        {done && badge.detail ? badge.detail : badge.subtitle}
      </span>
    </div>
  );
}
