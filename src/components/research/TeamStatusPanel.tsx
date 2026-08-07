"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cytapi,
  type TeamStatus,
  type TeamAgentState,
  type AgentTeam,
  type AvailableAgent,
  type AgentRecord,
} from "@/lib/api";
import { label } from "@/lib/utils";
import {
  Loader2,
  RefreshCw,
  Search,
  Plus,
  X,
  Shield,
  ChevronLeft,
  Activity,
} from "lucide-react";

/**
 * Team tab — Winslow's coordination check-in across the specialist roster AND the
 * place to manage who's on the team. Search the roster, ADD optional agents (e.g.
 * Winslow Prime), remove the ones you added, and click any agent to see its record.
 * Each row shows real state (on track / idle / blocked / no runs yet) derived from
 * backend run/task data — the panel never invents status. "Check in" runs a fresh
 * standup now.
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
  const [team, setTeam] = useState<AgentTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [recordFor, setRecordFor] = useState<string | null>(null);
  const [record, setRecord] = useState<AgentRecord | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await cytapi.teamStatus(topicId));
    } catch {
      /* fail-soft: keep last-good data */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  const loadTeam = useCallback(async () => {
    try {
      setTeam(await cytapi.topicTeam(topicId));
    } catch {
      /* fail-soft */
    }
  }, [topicId]);

  useEffect(() => {
    load();
    loadTeam();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load, loadTeam]);

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

  async function openRecord(type: string) {
    setRecordFor(type);
    setRecord(null);
    try {
      setRecord(await cytapi.agentRecord(topicId, type));
    } catch {
      /* fail soft */
    }
  }

  async function add(type: string) {
    if (busy) return;
    setBusy(type);
    try {
      setTeam(await cytapi.addTopicAgent(topicId, type));
      load(); // refresh states so the new agent shows in the roster
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  async function remove(type: string) {
    if (busy) return;
    setBusy(type);
    try {
      setTeam(await cytapi.removeTopicAgent(topicId, type));
      load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  const roster = data?.roster ?? [];
  const stats = data?.stats ?? {};

  // Management metadata (removable flag + role) keyed by agent type.
  const meta = new Map<string, { removable: boolean; role: string }>();
  (team?.team ?? []).forEach((m) =>
    meta.set(m.agent_type, { removable: m.removable, role: m.role }),
  );

  const needle = q.trim().toLowerCase();
  const matches = (type: string, role?: string) =>
    !needle ||
    label(type).toLowerCase().includes(needle) ||
    (role ?? "").toLowerCase().includes(needle);

  const visibleRoster = roster.filter((a) =>
    matches(a.agent_type, meta.get(a.agent_type)?.role),
  );
  const available = (team?.available ?? []).filter((a) =>
    matches(a.agent_type, a.role),
  );

  // Record view takes over the whole panel.
  if (recordFor) {
    return (
      <div className="p-4">
        <AgentRecordView
          type={recordFor}
          record={record}
          onBack={() => {
            setRecordFor(null);
            setRecord(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Team status</h3>
          <p className="text-[13px] text-mut">
            Winslow&apos;s check-in across the roster — who&apos;s on track, idle,
            or blocked. Search to add or remove agents.
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

      {/* Search the roster / find agents to add */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2">
        <Search size={14} className="text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search agents by name or role…"
          className="w-full bg-transparent text-[13px] text-ink placeholder:text-dim focus:outline-none"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-dim hover:text-ink"
            title="Clear"
          >
            <X size={13} />
          </button>
        )}
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

          {/* Agents available to ADD (surface when searching or when any exist) */}
          {available.length > 0 ? (
            <div>
              <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
                Add to team
              </div>
              <div className="grid gap-2">
                {available.map((a: AvailableAgent) => (
                  <div
                    key={a.agent_type}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-dashed border-line bg-panel p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-ink">
                        {label(a.agent_type)}
                      </div>
                      <div className="truncate text-[12px] text-dim">
                        {a.role}
                      </div>
                    </div>
                    <button
                      onClick={() => add(a.agent_type)}
                      disabled={busy === a.agent_type}
                      className="cyt-gradient-bg inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-bg disabled:opacity-60"
                    >
                      {busy === a.agent_type ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* The roster — one row per specialist, click for its record */}
          <div>
            <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
              Roster
            </div>
            <div className="grid gap-2">
              {visibleRoster.map((a) => {
                const m = meta.get(a.agent_type);
                return (
                  <div
                    key={a.agent_type}
                    className="flex items-start gap-2.5 rounded-xl border border-line bg-panel p-3"
                  >
                    <Dot state={a.state} />
                    <button
                      onClick={() => openRecord(a.agent_type)}
                      title="View this agent's record"
                      className="min-w-0 flex-1 text-left"
                    >
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
                      <div className="mt-0.5 text-[12.5px] text-mut">
                        {a.focus}
                      </div>
                      <div className="mt-1 text-[12px] text-dim">{a.note}</div>
                    </button>
                    <div className="shrink-0 self-center">
                      {m?.removable ? (
                        <button
                          onClick={() => remove(a.agent_type)}
                          disabled={busy === a.agent_type}
                          title="Remove from team"
                          className="rounded-lg border border-line px-1.5 py-1 text-mut transition-colors hover:border-bad/50 hover:text-bad disabled:opacity-60"
                        >
                          {busy === a.agent_type ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <X size={13} />
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-dim">
                          <Shield size={11} /> Core
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {visibleRoster.length === 0 && available.length === 0 ? (
                <p className="text-[13px] text-dim">
                  No agents match &ldquo;{q}&rdquo;.
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** An agent's identity + charter + recallable body of work. */
function AgentRecordView({
  type,
  record,
  onBack,
}: {
  type: string;
  record: AgentRecord | null;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-mut hover:text-ink"
      >
        <ChevronLeft size={14} /> Back to team
      </button>
      {!record ? (
        <div className="flex items-center gap-2 px-1 py-3 text-[12.5px] text-dim">
          <Loader2 size={13} className="animate-spin" /> Loading record…
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[15px] font-bold text-ink">{label(type)}</div>
            <div className="text-[12px] text-dim">{record.agent.role}</div>
            {record.agent.mission && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-mut">
                {record.agent.mission}
              </p>
            )}
          </div>

          {record.agent.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {record.agent.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10.5px] text-mut"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Runs", String(record.record.runs)],
              ["Done", String(record.record.succeeded)],
              ["Spent", `$${record.record.total_cost_usd.toFixed(2)}`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-line bg-panel2 py-1.5"
              >
                <div className="text-[15px] font-bold tabular-nums text-ink">
                  {v}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-dim">
                  {k}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-dim">
              <Activity size={11} /> Recent work
            </div>
            {record.record.recent_work.length === 0 ? (
              <p className="text-[12px] text-dim">No work recorded yet.</p>
            ) : (
              <ul className="space-y-1">
                {record.record.recent_work.map((w) => (
                  <li
                    key={w.run_id}
                    className="rounded-lg border border-line bg-panel2 px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-dim">
                      <span
                        className={
                          w.status === "succeeded"
                            ? "text-good"
                            : w.status === "failed"
                              ? "text-bad"
                              : ""
                        }
                      >
                        {w.status}
                      </span>
                      <span>
                        {w.at ? new Date(w.at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink/90">
                      {w.summary ?? (
                        <span className="text-dim">(no summary)</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
