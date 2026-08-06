"use client";

import { useCallback, useEffect, useState } from "react";
import { cytapi, type TeamStatus, type TeamAgentState } from "@/lib/api";
import { label } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * Team tab — Winslow's coordination check-in across the specialist roster. Shows
 * each agent's state (on track / idle / blocked / no runs yet), what it's on right
 * now, and Winslow's per-agent coordination note, plus the team-level summary.
 * States come straight from the backend, which derives them from real run/task
 * data — the panel never invents status. "Check in" runs a fresh standup now.
 */

const STATE_COLOR: Record<TeamAgentState, string> = {
  on_track: "#22c55e",
  idle: "#64748b",
  blocked: "#ef4444",
  never_run: "#eab308",
};

const STATE_TALLY_LABEL: Record<TeamAgentState, string> = {
  on_track: "on track",
  idle: "idle",
  blocked: "blocked",
  never_run: "awaiting first run",
};

function Dot({ state }: { state: TeamAgentState }) {
  return (
    <span
      className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        state === "on_track" ? "animate-pulse" : ""
      }`}
      style={{ backgroundColor: STATE_COLOR[state] }}
    />
  );
}

function Badge({ state, text }: { state: TeamAgentState; text: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: `${STATE_COLOR[state]}22`,
        color: STATE_COLOR[state],
      }}
    >
      {text}
    </span>
  );
}

export function TeamStatusPanel({ topicId }: { topicId: string }) {
  const [data, setData] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await cytapi.teamStatus(topicId));
    } catch {
      /* fail-soft: keep last-good data */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const runCheckIn = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await cytapi.teamCheckIn(topicId));
    } catch {
      /* ignore — the periodic poll will recover */
    } finally {
      setRefreshing(false);
    }
  }, [topicId]);

  const roster = data?.roster ?? [];
  const stats = data?.stats ?? {};

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Team status</h3>
          <p className="text-[13px] text-mut">
            Winslow&apos;s check-in across the roster — who&apos;s on track, idle,
            or blocked.
          </p>
        </div>
        <button
          onClick={runCheckIn}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel2 px-3 py-1.5 text-[12.5px] text-ink hover:text-brand disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Check in
        </button>
      </div>

      {loading && !data ? (
        <p className="text-[13px] text-dim">Reading team status…</p>
      ) : (
        <>
          {/* Winslow's team-level coordination summary + state tally */}
          {data?.summary ? (
            <div className="rounded-2xl border border-line bg-panel2 p-4">
              <div className="text-[12px] uppercase tracking-wider text-dim">
                Winslow&apos;s coordination summary
              </div>
              <p className="mt-1 text-[13.5px] text-ink">{data.summary}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(
                  ["on_track", "blocked", "idle", "never_run"] as TeamAgentState[]
                ).map((s) =>
                  (stats[s] ?? 0) > 0 ? (
                    <Badge
                      key={s}
                      state={s}
                      text={`${stats[s]} ${STATE_TALLY_LABEL[s]}`}
                    />
                  ) : null,
                )}
              </div>
            </div>
          ) : null}

          {/* Winslow's actionable coordination notes */}
          {(data?.coordination_notes?.length ?? 0) > 0 ? (
            <div>
              <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
                Coordination notes
              </div>
              <ul className="space-y-1.5">
                {data!.coordination_notes.map((n, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-line bg-panel p-2.5 text-[12.5px] text-mut"
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* The roster — one row per specialist */}
          <div>
            <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
              Roster
            </div>
            <div className="grid gap-2">
              {roster.map((a) => (
                <div
                  key={a.agent_type}
                  className="flex items-start gap-2.5 rounded-xl border border-line bg-panel p-3"
                >
                  <Dot state={a.state} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {label(a.agent_type)}
                      </span>
                      <Badge state={a.state} text={a.state_label} />
                      {(a.tasks_pending ?? 0) > 0 ? (
                        <span className="text-[11.5px] text-dim">
                          {a.tasks_pending} queued
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-mut">{a.focus}</div>
                    <div className="mt-1 text-[12px] text-dim">{a.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
