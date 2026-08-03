"use client";

import { useCallback, useState } from "react";
import { ArrowUpCircle, Loader2, Play } from "lucide-react";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { cn, label } from "@/lib/utils";
import {
  cytapi,
  type AgentStatus,
  type AgentDetail,
  type PrioritizeResult,
} from "@/lib/api";
import { Dialog } from "@/components/research/ProgressiveCard";

// The v1 crew (Orchestrator/CEO + focused core), with room for the rest.
const AGENT_ORDER = [
  "orchestrator",
  "business_planning",
  "competitor_research",
  "social_media",
  "email_outreach",
  "customer_support",
  "ads_management",
  "finance",
  "code_generation",
];

const AGENT_DESC: Record<string, string> = {
  orchestrator: "CEO · plans the day",
  business_planning: "strategy & KPIs",
  competitor_research: "market & rivals",
  social_media: "content drafts",
  email_outreach: "prospecting",
  customer_support: "inbox",
  ads_management: "campaigns",
  finance: "revenue & spend",
  code_generation: "builds the site",
};

function statusClass(s: AgentStatus | undefined): string {
  if (!s || !s.last_run_status) return "bg-dim";
  if (s.last_run_status === "running" || s.last_run_status === "in_progress")
    return "bg-warn animate-pulse2 shadow-[0_0_0_3px_#f6c45322]";
  if (s.last_run_status === "completed" || s.last_run_status === "success")
    return "bg-good";
  if (s.last_run_status === "failed" || s.last_run_status === "error")
    return "bg-bad";
  return "bg-dim";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export function AgentStatusGrid({
  companyId,
}: {
  companyId?: string | number;
}) {
  const { statuses, loading } = useAgentStatus(companyId);
  const byType = new Map(statuses.map((s) => [s.agent_type, s]));
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function open(id: string) {
    setOpenFor(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      setDetail(await cytapi.agentDetail(id, companyId));
    } catch {
      /* fail-soft — the modal shows the empty states */
    } finally {
      setLoadingDetail(false);
    }
  }

  const reload = useCallback(async () => {
    if (!openFor) return;
    try {
      setDetail(await cytapi.agentDetail(openFor, companyId));
    } catch {
      /* keep the last-good detail */
    }
  }, [openFor, companyId]);

  return (
    <>
      <div className="flex flex-col gap-0.5 p-2">
        {AGENT_ORDER.map((id) => {
          const s = byType.get(id);
          return (
            <button
              key={id}
              onClick={() => open(id)}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-2 py-2 text-left text-[13px] transition-colors hover:bg-panel2"
              title={`Open ${label(id)}`}
            >
              <span
                className={cn(
                  "mt-0.5 h-2 w-2 shrink-0 self-start rounded-full",
                  loading ? "bg-dim" : statusClass(s),
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{label(id)}</span>
                {s?.last_action && (
                  <span className="block truncate text-[11px] text-dim">
                    {s.last_action}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] text-dim">
                {s?.tasks_pending
                  ? `${s.tasks_pending} queued`
                  : (AGENT_DESC[id] ?? "")}
              </span>
            </button>
          );
        })}
      </div>

      {openFor && (
        <Dialog title={label(openFor)} onClose={() => setOpenFor(null)}>
          {loadingDetail && !detail ? (
            <div className="py-8 text-center text-[13px] text-mut">
              Loading the agent&apos;s work…
            </div>
          ) : detail ? (
            <AgentDetailView d={detail} companyId={companyId} onReload={reload} />
          ) : (
            <div className="py-8 text-center text-[13px] text-dim">
              No data for this agent yet.
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}

function StatusPill({ s }: { s: string }) {
  const tone =
    s === "completed" || s === "succeeded" || s === "success"
      ? "text-good"
      : s === "failed" || s === "error"
        ? "text-bad"
        : s === "running" || s === "in_progress"
          ? "text-warn"
          : "text-dim";
  return (
    <span className={`text-[11px] uppercase tracking-wide ${tone}`}>{s}</span>
  );
}

function Row({
  left,
  right,
  sub,
}: {
  left: string;
  right?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="border-b border-line py-2 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] text-ink">{left}</span>
        {right}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-dim">{sub}</div>}
    </div>
  );
}

function AgentDetailView({
  d,
  companyId,
  onReload,
}: {
  d: AgentDetail;
  companyId?: string | number;
  onReload: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [review, setReview] = useState<PrioritizeResult | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  async function prioritize(taskId: number) {
    setBusyId(taskId);
    try {
      const res = await cytapi.prioritizeTask(taskId);
      setReview(res);
      await onReload();
    } catch {
      /* fail-soft */
    } finally {
      setBusyId(null);
    }
  }

  async function runNow() {
    if (triggering) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      await cytapi.agentTrigger(d.agent_type, companyId);
      setTriggerMsg("Queued — this agent is running now.");
      // Give the job a moment to land, then refresh the run/queue view.
      setTimeout(() => void onReload(), 1500);
    } catch {
      setTriggerMsg("Couldn't trigger — please try again.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] text-mut">{d.role}</div>
        <button
          onClick={runNow}
          disabled={triggering}
          title="Kick a one-off run of this agent for this topic"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#223257] bg-brand/10 px-2.5 py-1 text-[12px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
        >
          {triggering ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Play size={12} />
          )}
          Run now
        </button>
      </div>
      {triggerMsg && <div className="text-[12px] text-good">{triggerMsg}</div>}

      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-dim">
          Skills
        </div>
        <div className="flex flex-wrap gap-1.5">
          {d.skills.map((sk) => (
            <span
              key={sk}
              className="rounded-full border border-[#223257] bg-[#16203a] px-2.5 py-1 text-[11px] text-brand"
            >
              {sk}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-5 text-[12px]">
        <span className="text-mut">
          <span className="text-ink">{d.stats.runs_total}</span> runs
        </span>
        <span className="text-mut">
          <span className="text-ink">{d.stats.tasks_pending}</span> queued
        </span>
        <span className="text-mut">
          <span className="text-ink">{d.stats.tasks_total}</span> tasks
        </span>
        <span className="text-mut">
          <span className="text-ink">${d.stats.cost_usd}</span> spend
        </span>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-dim">
          Queue ({d.queue.length}) — assigned by the team lead, by priority
        </div>

        {review && (
          <div className="mb-2 rounded-[10px] border border-[#3a2f12] bg-[#1c160a] p-3">
            <div className="text-[12px] font-medium text-warn">
              Orchestrator review
            </div>
            <div className="mt-1 text-[12px] text-ink/90">
              {review.orchestrator_review}
            </div>
            {review.dependencies_reviewed.length > 0 && (
              <div className="mt-2 space-y-1">
                {review.dependencies_reviewed.map((dp) => (
                  <div
                    key={dp.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-mut">
                      {dp.title}{" "}
                      <span className="text-dim">({label(dp.agent_type)})</span>
                    </span>
                    <span className={dp.prioritized ? "text-good" : "text-dim"}>
                      {dp.prioritized ? "moved ahead ↑" : `${dp.status}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {d.queue.length === 0 ? (
          <div className="py-2 text-[12px] text-dim">Nothing queued.</div>
        ) : (
          d.queue.map((t) => (
            <div key={t.id} className="border-b border-line py-2 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[13px] text-ink">{t.title}</span>
                <StatusPill s={t.status} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-dim">
                  priority {t.priority}
                  {t.depends_on_count
                    ? ` · ${t.depends_on_count} dependency${t.depends_on_count > 1 ? "ies" : ""}`
                    : ""}{" "}
                  · {t.source}
                </span>
                {t.prioritized ? (
                  <span className="text-[11px] font-medium text-good">
                    ✓ prioritized
                  </span>
                ) : (
                  <button
                    onClick={() => prioritize(t.id)}
                    disabled={busyId === t.id}
                    title="Ask the orchestrator to move this up (and any blocking dependencies)"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-[#223257] bg-brand/10 px-2.5 py-1 text-[12px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
                  >
                    {busyId === t.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ArrowUpCircle size={12} />
                    )}
                    Prioritize
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-dim">
          Process ({d.runs.length}) — what it did, run by run
        </div>
        {d.runs.length === 0 ? (
          <div className="py-2 text-[12px] text-dim">No runs yet.</div>
        ) : (
          d.runs.map((r) => (
            <Row
              key={r.id}
              left={r.summary ?? r.run_type}
              right={<StatusPill s={r.status} />}
              sub={`${fmtTime(r.started_at)} · ${r.duration_secs ?? 0}s · $${r.cost_usd ?? 0} · ${r.tokens_used ?? 0} tokens`}
            />
          ))
        )}
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-dim">
          Recent actions
        </div>
        {d.actions.length === 0 ? (
          <div className="py-2 text-[12px] text-dim">No actions yet.</div>
        ) : (
          d.actions.map((a) => (
            <div key={a.id} className="border-b border-line py-1.5 last:border-0">
              <span className="text-[13px] text-ink">{a.summary}</span>
              <span className="ml-2 text-[11px] text-dim">
                {fmtTime(a.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
