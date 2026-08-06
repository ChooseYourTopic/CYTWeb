"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DrillDownModal,
  StatusPill,
} from "@/components/research/DrillDownModal";
import { label, timeAgo } from "@/lib/utils";
import {
  cytapi,
  type AgentStatus,
  type FinanceSummary,
  type KpiFindings,
  type KpiSpend,
  type KpiTasksToday,
  type TopicOverview,
} from "@/lib/api";

// Which drill-down a tile opens. Tiles with no listable set have no `drill`.
type DrillKey = "tasks" | "findings" | "spend" | "agents";

type Tile = {
  label: string;
  value: string;
  sub: string;
  drill?: DrillKey;
};

/** Format a small USD amount (per-run costs can be fractions of a cent). */
function usd(n: number, max = 4): string {
  return `$${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  })}`;
}

/**
 * KPI row: tasks, findings, active agents, and capped spend. Fail-soft to
 * skeletons while the overview loads. Tiles whose number has a listable set
 * behind it (tasks today, findings, agents active, spend) are clickable and
 * open a drill-down modal listing those items; the numbers themselves are
 * never changed.
 */
export function KpiTiles({
  overview,
  finance,
  findings,
  activeAgents,
  agentStatuses = [],
  topicId,
  loading,
}: {
  overview: TopicOverview | null;
  finance: FinanceSummary | null;
  findings: number;
  // Live count of agents actually working/queued now (from useAgentStatus).
  activeAgents?: number;
  // Full per-agent status list, so the "Agents active" drill reuses live data.
  agentStatuses?: AgentStatus[];
  topicId?: string;
  loading: boolean;
}) {
  const k = overview?.kpis ?? {};
  const totalAgents = k.total_agents ?? 9;
  // Prefer the REAL per-company AI spend from /finance/summary; fall back to
  // the overview estimate only when the finance snapshot isn't available yet.
  const spend =
    finance?.ai_spend_cents != null
      ? finance.ai_spend_cents / 100
      : (k.spend_usd ?? 0);
  const cap =
    finance?.ai_spend_cap_cents != null
      ? finance.ai_spend_cap_cents / 100
      : k.spend_cap_usd;

  const tiles: Tile[] = [
    {
      label: "Tasks today",
      value: String(k.tasks_today ?? 0),
      sub: "queued by the CEO",
      drill: "tasks",
    },
    {
      label: "Findings",
      value: String(findings || k.findings || 0),
      sub: "research gathered",
      drill: "findings",
    },
    {
      label: "Agents active",
      value: `${activeAgents ?? 0}/${totalAgents}`,
      sub: (activeAgents ?? 0) > 0 ? "working now" : "all idle",
      drill: "agents",
    },
    {
      label: "Est. spend",
      value: `$${Number(spend).toFixed(2)}`,
      sub: cap ? `capped at $${Number(cap).toFixed(2)}` : "capped & sandboxed",
      drill: "spend",
    },
  ];

  const [open, setOpen] = useState<DrillKey | null>(null);
  // Drill-downs are only meaningful once we know which topic to query.
  const canDrill = Boolean(topicId);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => {
          const clickable = canDrill && Boolean(t.drill);
          return (
            <button
              key={t.label}
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => setOpen(t.drill!) : undefined}
              aria-haspopup={clickable ? "dialog" : undefined}
              title={clickable ? `View the ${t.label.toLowerCase()}` : undefined}
              className={`rounded-card border border-line bg-panel px-4 py-3.5 text-left transition-colors ${
                clickable
                  ? "cursor-pointer hover:border-brand/60 hover:bg-panel2 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                  : "cursor-default"
              }`}
            >
              <div className="text-[12px] uppercase tracking-wide text-mut">
                {t.label}
              </div>
              {loading && !overview ? (
                <Skeleton className="mt-2 h-6 w-16" />
              ) : (
                <div className="mt-1.5 text-[24px] font-bold">{t.value}</div>
              )}
              <div className="mt-0.5 text-[12px] text-dim">{t.sub}</div>
            </button>
          );
        })}
      </div>

      {open === "tasks" && topicId && (
        <TasksDrill topicId={topicId} onClose={() => setOpen(null)} />
      )}
      {open === "findings" && topicId && (
        <FindingsDrill topicId={topicId} onClose={() => setOpen(null)} />
      )}
      {open === "spend" && topicId && (
        <SpendDrill topicId={topicId} onClose={() => setOpen(null)} />
      )}
      {open === "agents" && (
        <AgentsDrill
          statuses={agentStatuses}
          total={totalAgents}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** Generic loader for the fetched drill-downs. */
function useDrill<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load these — try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher is a fresh closure per open; topicId is stable within one modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, loading, error };
}

function TasksDrill({
  topicId,
  onClose,
}: {
  topicId: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useDrill<KpiTasksToday>(() =>
    cytapi.kpiTasksToday(topicId),
  );
  const items = data?.items ?? [];
  return (
    <DrillDownModal
      title="Tasks today"
      subtitle="Work the CEO queued for the crew today"
      count={data?.total}
      loading={loading}
      error={error}
      empty={items.length === 0}
      emptyLabel="No tasks have been queued today yet."
      onClose={onClose}
    >
      <ul className="space-y-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium text-ink">
                {t.title}
              </div>
              <div className="mt-0.5 text-[12px] text-mut">
                {label(t.agent_type)}
                {t.created_at ? ` · ${timeAgo(t.created_at)}` : ""}
              </div>
            </div>
            <StatusPill status={t.status} />
          </li>
        ))}
      </ul>
    </DrillDownModal>
  );
}

function FindingsDrill({
  topicId,
  onClose,
}: {
  topicId: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useDrill<KpiFindings>(() =>
    cytapi.kpiFindings(topicId),
  );
  const items = data?.items ?? [];
  const counts = data?.counts;
  return (
    <DrillDownModal
      title="Findings"
      subtitle={
        counts
          ? `${counts.competitors} competitor${
              counts.competitors === 1 ? "" : "s"
            } mapped · ${counts.posts} draft${counts.posts === 1 ? "" : "s"} gathered`
          : "Research the crew has gathered"
      }
      count={data?.total}
      loading={loading}
      error={error}
      empty={items.length === 0}
      emptyLabel="No findings gathered yet — the research agents are still working."
      onClose={onClose}
    >
      <ul className="space-y-2">
        {items.map((f) => (
          <li
            key={f.id}
            className="rounded-xl border border-line bg-panel2 px-3.5 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-[13.5px] font-medium text-ink">
                {f.title}
              </div>
              <span className="shrink-0 rounded-full border border-line bg-panel px-2 py-0.5 text-[11px] font-semibold capitalize text-mut">
                {f.kind === "competitor" ? "Competitor" : "Draft"}
              </span>
            </div>
            {f.summary && (
              <p className="mt-1 line-clamp-2 text-[12.5px] text-mut">
                {f.summary}
              </p>
            )}
          </li>
        ))}
      </ul>
    </DrillDownModal>
  );
}

function SpendDrill({
  topicId,
  onClose,
}: {
  topicId: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useDrill<KpiSpend>(() =>
    cytapi.kpiSpend(topicId),
  );
  const byAgent = data?.by_agent ?? [];
  const runs = data?.items ?? [];
  const total = data?.total_usd ?? 0;
  const maxAgent = Math.max(...byAgent.map((a) => a.cost_usd), 0.0001);

  return (
    <DrillDownModal
      title="Spend breakdown"
      subtitle="Real per-company AI model spend, run by run"
      loading={loading}
      error={error}
      empty={runs.length === 0}
      emptyLabel="No model spend recorded yet — agents run sandboxed until you go live."
      footer={
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-mut">Total spend</span>
          <span className="font-bold text-ink">{usd(total)}</span>
        </div>
      }
      onClose={onClose}
    >
      {byAgent.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mut">
            By agent
          </div>
          <ul className="space-y-2">
            {byAgent.map((a) => (
              <li key={a.agent_type}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink">{label(a.agent_type)}</span>
                  <span className="text-mut">
                    {usd(a.cost_usd)} · {a.runs} run{a.runs === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{
                      width: `${Math.max(3, (a.cost_usd / maxAgent) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mut">
        Runs
      </div>
      <ul className="space-y-2">
        {runs.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-ink">
                {label(r.agent_type)}
                <span className="text-mut"> · {r.run_type}</span>
              </div>
              <div className="mt-0.5 text-[11.5px] text-mut">
                {r.model ?? "model n/a"}
                {r.tokens_used != null
                  ? ` · ${r.tokens_used.toLocaleString()} tok`
                  : ""}
                {r.duration_secs != null ? ` · ${r.duration_secs}s` : ""}
                {r.started_at ? ` · ${timeAgo(r.started_at)}` : ""}
              </div>
            </div>
            <span className="shrink-0 text-[13px] font-semibold text-ink">
              {usd(r.cost_usd, 6)}
            </span>
          </li>
        ))}
      </ul>
    </DrillDownModal>
  );
}

function AgentsDrill({
  statuses,
  total,
  onClose,
}: {
  statuses: AgentStatus[];
  total: number;
  onClose: () => void;
}) {
  // Active = running/in-progress now, or with queued work — same rule the tile
  // uses (see ResearchDashboard.activeAgents).
  const active = statuses.filter((s) => {
    const st = (s.last_run_status ?? "").toLowerCase();
    return (
      st === "running" || st === "in_progress" || (s.tasks_pending ?? 0) > 0
    );
  });
  return (
    <DrillDownModal
      title="Agents active"
      subtitle={`${active.length} of ${total} working or with queued work`}
      count={active.length}
      loading={false}
      empty={active.length === 0}
      emptyLabel="All agents are idle right now."
      onClose={onClose}
    >
      <ul className="space-y-2">
        {active.map((a) => (
          <li
            key={a.agent_type}
            className="flex items-start justify-between gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium text-ink">
                {label(a.agent_type)}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-mut">
                {a.last_action ?? "Working…"}
              </div>
            </div>
            <span className="shrink-0 text-[12px] text-mut">
              {(a.tasks_pending ?? 0) > 0
                ? `${a.tasks_pending} queued`
                : "running"}
            </span>
          </li>
        ))}
      </ul>
    </DrillDownModal>
  );
}
