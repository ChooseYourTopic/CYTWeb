"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Flame,
  Timer,
  Lock,
  Check,
  Gift,
  Trophy,
} from "lucide-react";
import {
  cytapi,
  type BattlePassStatus,
  type BattlePassTiers,
  type BattlePassTier,
  type BattlePassTrackKey,
  type PaceBadge,
} from "@/lib/api";
import { iconFor, frameFor } from "@/components/research/challengeIcons";

/** Live-ticking days:hours:minutes:seconds from an ISO deadline. */
function useCountdown(endsAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const secs = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  return {
    secs,
    d: Math.floor(secs / 86400),
    h: Math.floor((secs % 86400) / 3600),
    m: Math.floor((secs % 3600) / 60),
    s: secs % 60,
    urgent: secs > 0 && secs < 72 * 3600,
  };
}

const PACE_BADGE: Record<PaceBadge, { label: string; cls: string }> = {
  ahead: {
    label: "AHEAD 🔥",
    cls: "border-[#1f3d2e] bg-[#0e1c16] text-good",
  },
  on_pace: {
    label: "ON PACE",
    cls: "border-brand/50 bg-brand/10 text-brand",
  },
  behind: {
    label: "BEHIND ⏳",
    cls: "border-[#4a3b1a] bg-[#1c1708] text-warn",
  },
};

function TierCard({
  tier,
  onClaim,
  claiming,
}: {
  tier: BattlePassTier;
  onClaim: (tier: number) => void;
  claiming: boolean;
}) {
  const RIcon = iconFor(tier.reward.icon);
  const state = tier.claimed
    ? "claimed"
    : tier.unlocked
      ? "unlocked"
      : "locked";
  return (
    <div
      className={`flex w-[128px] shrink-0 flex-col justify-between rounded-xl border p-2.5 ${
        state === "claimed"
          ? "border-[#1f3d2e] bg-[#0e1c16]"
          : state === "unlocked"
            ? "border-brand/50 bg-brand/10"
            : "border-line bg-panel2 opacity-70"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-mut">
          T{tier.tier}
        </span>
        {state === "claimed" ? (
          <Check size={13} className="text-good" />
        ) : state === "locked" ? (
          <Lock size={12} className="text-dim" />
        ) : (
          <Gift size={13} className="text-brand" />
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <RIcon
          size={16}
          className={state === "locked" ? "text-dim" : "text-brand"}
        />
        <span className="text-[12px] leading-tight text-ink/90">
          {tier.reward.label}
        </span>
      </div>
      <div className="mt-1 text-[10.5px] text-dim">{tier.threshold_xp} XP</div>
      {state === "unlocked" && (
        <button
          type="button"
          onClick={() => onClaim(tier.tier)}
          disabled={claiming}
          className="cyt-gradient-bg mt-2 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-bold text-bg disabled:opacity-60"
        >
          {claiming ? <Loader2 size={11} className="animate-spin" /> : null}
          Claim
        </button>
      )}
      {state === "claimed" && (
        <div className="mt-2 text-center text-[11px] font-semibold text-good">
          Claimed
        </div>
      )}
    </div>
  );
}

/**
 * The Battle Pass tab — the topic's 29-day season: countdown + pace, streak,
 * weekly/monthly track switch, XP progress to the next tier, and the tier rail
 * with reward claims. Fails soft to a skeleton when the backend is not up.
 */
export function BattlePassPanel({ topicId }: { topicId?: string }) {
  const [status, setStatus] = useState<BattlePassStatus | null>(null);
  const [tiers, setTiers] = useState<BattlePassTiers | null>(null);
  const [track, setTrack] = useState<BattlePassTrackKey>("monthly");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!topicId) return;
    try {
      const [s, t] = await Promise.all([
        cytapi.battlePass(topicId),
        cytapi.battlePassTiers(topicId),
      ]);
      setStatus(s);
      setTiers(t);
    } catch {
      /* fail soft */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  const countdown = useCountdown(status?.season.ends_at);

  const activeTrack = status?.tracks[track];
  const tierList = tiers?.tracks[track] ?? [];

  const progressPct = useMemo(() => {
    if (!activeTrack) return 0;
    const floor = activeTrack.tier_floor_xp;
    const next = activeTrack.next_tier_xp;
    if (next == null) return 100; // max tier
    const span = next - floor;
    if (span <= 0) return 100;
    return Math.min(100, Math.max(0, ((activeTrack.xp - floor) / span) * 100));
  }, [activeTrack]);

  async function claim(tier: number) {
    if (!topicId || claiming !== null) return;
    setClaiming(tier);
    setToast(null);
    try {
      const r = await cytapi.claimTier(topicId, track, tier);
      setToast(
        r.claimed
          ? `Claimed T${tier}: ${r.reward.label} 🎉`
          : `T${tier} already claimed.`,
      );
      await load();
    } catch {
      setToast("Couldn't claim that tier — try again.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[13px] text-dim">
        <Loader2 size={14} className="animate-spin" /> Loading your season…
      </div>
    );
  }

  if (!status || !activeTrack) {
    return (
      <div className="p-6 text-[13px] text-dim">
        Battle Pass isn&apos;t available yet — complete a challenge on the
        Overview tab to start your season.
      </div>
    );
  }

  const pace = PACE_BADGE[status.pace.badge];

  return (
    <div className="space-y-4 p-4">
      {/* Season header: countdown + pace */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel2 px-4 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-mut">
            {status.season.name ?? "Season"} · {status.season.status}
          </div>
          <div
            className={`mt-1 flex items-center gap-1.5 text-[20px] font-bold tabular-nums ${
              countdown?.urgent ? "animate-pulse text-bad" : "text-ink"
            }`}
          >
            <Timer size={18} className="shrink-0" />
            {countdown ? (
              <span>
                {countdown.d}d {String(countdown.h).padStart(2, "0")}h{" "}
                {String(countdown.m).padStart(2, "0")}m{" "}
                {String(countdown.s).padStart(2, "0")}s
              </span>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="text-[12px] text-dim">
            Clear all monthly tiers before the clock runs out.
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-full border px-3 py-1 text-[12px] font-bold uppercase tracking-wider ${pace.cls}`}
          >
            {pace.label}
          </span>
          <span className="text-[11.5px] text-mut">
            Par {status.pace.par_xp} XP · you {status.pace.xp} XP
          </span>
          {status.pace.projected_finish_day != null && (
            <span className="text-[11px] text-dim">
              On track to finish ~Day {status.pace.projected_finish_day}
            </span>
          )}
        </div>
      </div>

      {/* Streak + track switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#4a3b1a] bg-[#1c1708] px-3 py-1.5 text-[13px] font-semibold text-warn">
          <Flame size={15} />
          {status.streak.days}-day streak
          {status.streak.longest > status.streak.days ? (
            <span className="text-[11px] font-normal text-dim">
              (best {status.streak.longest})
            </span>
          ) : null}
        </div>
        <div className="flex rounded-xl border border-line bg-panel2 p-0.5">
          {(["weekly", "monthly"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTrack(k)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                track === k
                  ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
                  : "text-mut hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* XP progress to next tier */}
      <div className="rounded-xl border border-line bg-panel2 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="font-semibold text-ink">
            Tier {activeTrack.tier}
            <span className="ml-1.5 font-normal text-mut">
              / {activeTrack.max_tier}
            </span>
          </span>
          <span className="text-mut">
            {activeTrack.next_tier_xp != null ? (
              <>
                {activeTrack.xp} / {activeTrack.next_tier_xp} XP
              </>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-good">
                <Trophy size={13} /> Max tier
              </span>
            )}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel">
          <div
            className="cyt-gradient-bg h-full rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tier rail */}
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-dim">
          {track} reward track
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tierList.map((t) => (
            <TierCard
              key={t.tier}
              tier={t}
              onClaim={claim}
              claiming={claiming === t.tier}
            />
          ))}
        </div>
      </div>

      {toast && (
        <p className="rounded-lg border border-[#1f3d2e] bg-[#0e1c16] px-3 py-2 text-[12.5px] text-good">
          {toast}
        </p>
      )}
    </div>
  );
}
