"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpCircle, Loader2, Play, Plus, Search, X } from "lucide-react";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useModelConnected } from "@/hooks/useModelConnected";
import { ConnectModelPrompt } from "@/components/research/ConnectModelPrompt";
import { cn, label, timeAgo } from "@/lib/utils";
import {
  cytapi,
  type AgentStatus,
  type AgentDetail,
  type AgentProfile,
  type AgentTeam,
  type AvailableAgent,
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

// Real-time status legend (Tracy, 2026-08-08). Every light reflects the agent's
// ACTUAL backend state — never invented:
//   green  = healthy — steady when it last ran OK & is idle, pulsing while active
//   yellow = paused
//   blue   = user input needed (forward-ready: lights only once the backend emits
//            such a status — no agent shows blue until that signal exists)
//   red    = stopped / problem / error
//   purple, orange = RESERVED for future statuses (not emitted yet)
//   grey   = no run yet / unknown
function statusClass(s: AgentStatus | undefined): string {
  const st = (s?.last_run_status ?? "").toLowerCase();
  if (!st) return "bg-dim";
  // Active now — green, pulsing.
  if (st === "running" || st === "in_progress")
    return "bg-good animate-pulse2 shadow-[0_0_0_3px_#22c55e22]";
  // Ran OK, idle — steady green.
  if (st === "succeeded" || st === "completed" || st === "success")
    return "bg-good";
  // Paused — yellow.
  if (st === "paused") return "bg-warn";
  // User input needed — blue (forward-ready).
  if (
    st === "needs_input" ||
    st === "awaiting_input" ||
    st === "input_required" ||
    st === "user_input_needed"
  )
    return "bg-[#3b82f6]";
  // Stopped / problem — red.
  if (st === "failed" || st === "error" || st === "stopped") return "bg-bad";
  // Unmapped (e.g. 'blocked') stays neutral until assigned; purple/orange reserved.
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
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // The topic's live roster + the inventory of agents available to add. Reused
  // from the same endpoints the main Team tab drives, so the rail and the tab
  // never disagree about who's on the team.
  const [team, setTeam] = useState<AgentTeam | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [busyAdd, setBusyAdd] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    if (!companyId) return;
    try {
      setTeam(await cytapi.topicTeam(companyId));
    } catch {
      /* fail-soft: the fixed v1 crew still renders without the roster */
    }
  }, [companyId]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  async function addAgent(type: string) {
    if (!companyId || busyAdd) return;
    setBusyAdd(type);
    try {
      setTeam(await cytapi.addTopicAgent(companyId, type));
      setQ("");
    } catch {
      /* ignore — the row stays available to retry */
    } finally {
      setBusyAdd(null);
    }
  }

  async function removeAgent(type: string) {
    if (!companyId || busyAdd) return;
    setBusyAdd(type);
    try {
      setTeam(await cytapi.removeTopicAgent(companyId, type));
    } catch {
      /* ignore */
    } finally {
      setBusyAdd(null);
    }
  }

  // Removable flag per agent type (core agents can't be removed).
  const removable = new Map<string, boolean>();
  (team?.team ?? []).forEach((m) => removable.set(m.agent_type, m.removable));

  // Display order: the fixed v1 crew first, then any extra agents the owner has
  // added to this topic that aren't already in that base order.
  const displayOrder = [
    ...AGENT_ORDER,
    ...(team?.team ?? [])
      .map((m) => m.agent_type)
      .filter((t) => !AGENT_ORDER.includes(t)),
  ];

  // Inventory to add, filtered by the search box (name or role).
  const needle = q.trim().toLowerCase();
  const available = (team?.available ?? []).filter(
    (a) =>
      !needle ||
      label(a.agent_type).toLowerCase().includes(needle) ||
      a.role.toLowerCase().includes(needle),
  );

  async function open(id: string) {
    setOpenFor(id);
    setDetail(null);
    setProfile(null);
    setLoadingDetail(true);
    // The profile (role/skills/loops/prompt) is owner-scoped and drives the view;
    // the detail (queue/runs/actions) is the live working picture. Fetch both.
    const detailP = cytapi.agentDetail(id, companyId).catch(() => null);
    const profileP = companyId
      ? cytapi.agentProfile(companyId, id).then((r) => r.agent).catch(() => null)
      : Promise.resolve(null);
    try {
      const [d, p] = await Promise.all([detailP, profileP]);
      if (d) setDetail(d);
      if (p) setProfile(p);
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

  const reloadProfile = useCallback(async () => {
    if (!openFor || !companyId) return;
    try {
      setProfile((await cytapi.agentProfile(companyId, openFor)).agent);
    } catch {
      /* keep the last-good profile */
    }
  }, [openFor, companyId]);

  return (
    <>
      <div className="flex flex-col gap-0.5 p-2">
        {/* Add-agent control: pull a specialist from the topic's roster inventory. */}
        {companyId && (
          <div className="mb-1 border-b border-line pb-2">
            <button
              onClick={() => {
                setShowAdd((v) => !v);
                setQ("");
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[9px] px-2 py-1.5 text-[12.5px] font-semibold transition-colors",
                showAdd
                  ? "bg-panel2 text-ink"
                  : "text-brand hover:bg-panel2",
              )}
              title="Add an agent from your roster"
            >
              {showAdd ? <X size={14} /> : <Plus size={14} />}
              {showAdd ? "Close" : "Add agent"}
            </button>

            {showAdd && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 rounded-[9px] border border-line bg-panel2 px-2.5 py-1.5">
                  <Search size={13} className="text-dim" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search your roster by name or role…"
                    className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-dim focus:outline-none"
                  />
                  {q && (
                    <button
                      onClick={() => setQ("")}
                      className="text-dim hover:text-ink"
                      title="Clear"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {available.length === 0 ? (
                    <p className="px-1 py-1 text-[12px] text-dim">
                      {team == null
                        ? "Loading your roster…"
                        : q
                          ? `No agents match “${q}”.`
                          : "Every available agent is already on the team."}
                    </p>
                  ) : (
                    available.map((a: AvailableAgent) => (
                      <div
                        key={a.agent_type}
                        className="flex items-center justify-between gap-2 rounded-[9px] border border-dashed border-line bg-panel px-2.5 py-1.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-ink">
                            {label(a.agent_type)}
                          </span>
                          <span className="block truncate text-[11px] text-dim">
                            {a.role}
                          </span>
                        </span>
                        <button
                          onClick={() => addAgent(a.agent_type)}
                          disabled={busyAdd === a.agent_type}
                          className="cyt-gradient-bg inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-bold text-bg disabled:opacity-60"
                        >
                          {busyAdd === a.agent_type ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Plus size={11} />
                          )}
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {displayOrder.map((id) => {
          const s = byType.get(id);
          const canRemove = removable.get(id) === true;
          return (
            <div
              key={id}
              className="group flex w-full items-center gap-2.5 rounded-[9px] px-2 py-2 text-[13px] transition-colors hover:bg-panel2"
            >
              <button
                onClick={() => open(id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
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
                    : s?.last_run_at
                      ? `last commit ${timeAgo(s.last_run_at)}`
                      : (AGENT_DESC[id] ?? team?.team.find((m) => m.agent_type === id)?.role ?? "")}
                </span>
              </button>
              {canRemove && (
                <button
                  onClick={() => removeAgent(id)}
                  disabled={busyAdd === id}
                  title="Remove from team"
                  className="shrink-0 rounded-md p-1 text-dim opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 disabled:opacity-60"
                >
                  {busyAdd === id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <X size={12} />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {openFor && (
        <Dialog title={label(openFor)} onClose={() => setOpenFor(null)}>
          {loadingDetail && !detail && !profile ? (
            <div className="py-8 text-center text-[13px] text-mut">
              Loading the agent&apos;s work…
            </div>
          ) : detail || profile ? (
            <AgentDetailView
              agentType={openFor}
              d={detail}
              profile={profile}
              companyId={companyId}
              onReload={reload}
              onReloadProfile={reloadProfile}
            />
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
  agentType,
  d,
  profile,
  companyId,
  onReload,
  onReloadProfile,
}: {
  agentType: string;
  d: AgentDetail | null;
  profile: AgentProfile | null;
  companyId?: string | number;
  onReload: () => Promise<void>;
  onReloadProfile: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [review, setReview] = useState<PrioritizeResult | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"queue" | "context" | "realign">("queue");
  const [ctxText, setCtxText] = useState("");
  const [ctxBusy, setCtxBusy] = useState(false);
  const [ctxMsg, setCtxMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [realignText, setRealignText] = useState("");
  const [realignBusy, setRealignBusy] = useState(false);
  const [realignMsg, setRealignMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // E6 gate: a one-off "Run now" is an agent run, so it's blocked until a model
  // is connected (API key / OAuth, or the XTKRecall MCP entitlement).
  const { blocked: modelGated } = useModelConnected(companyId);

  // Live working picture (queue/runs/actions/stats) is fail-soft: absent until
  // the detail endpoint answers. The profile drives role/skills/loops/prompt.
  const stats = d?.stats;
  const queue = d?.queue ?? [];
  const runs = d?.runs ?? [];
  const actions = d?.actions ?? [];
  const role = profile?.role ?? d?.role ?? "";
  // Skills come from the standard-schema profile (rich objects); fall back to the
  // detail endpoint's flat names so the panel still renders if the profile 404s.
  const skills = profile?.skills.length
    ? profile.skills
    : (d?.skills ?? []).map((name) => ({ key: name, name, description: "" }));
  const loops = profile?.loops ?? [];
  const override = profile?.prompt.override ?? null;

  // Where this agent's start-up ritual lives (shown in the description).
  const startupFile = `agents/${agentType}/startup-ritual.md`;

  async function saveContext() {
    if (!companyId || !ctxText.trim() || ctxBusy) return;
    setCtxBusy(true);
    setCtxMsg(null);
    try {
      const cur = await cytapi.topicContext(companyId);
      const note = `[${label(agentType)}] ${ctxText.trim()}`;
      const notes = cur.context?.notes ? `${cur.context.notes}\n${note}` : note;
      await cytapi.saveTopicContext(companyId, { notes });
      setCtxText("");
      setCtxMsg({ ok: true, text: "Context added for this agent." });
    } catch {
      setCtxMsg({ ok: false, text: "Couldn't save. Please try again." });
    } finally {
      setCtxBusy(false);
    }
  }

  async function realign() {
    if (!companyId || !realignText.trim() || realignBusy) return;
    setRealignBusy(true);
    setRealignMsg(null);
    try {
      await cytapi.realignAgent(companyId, agentType, realignText.trim());
      setRealignText("");
      setRealignMsg({ ok: true, text: "Realigned — this prompt now steers the agent." });
      await onReloadProfile();
    } catch {
      setRealignMsg({ ok: false, text: "Couldn't realign — please try again." });
    } finally {
      setRealignBusy(false);
    }
  }

  async function revertRealign() {
    if (!companyId || !override || realignBusy) return;
    setRealignBusy(true);
    setRealignMsg(null);
    try {
      await cytapi.deleteAgentPrompt(companyId, override.id);
      setRealignMsg({ ok: true, text: "Reverted to the built-in prompt." });
      await onReloadProfile();
    } catch {
      setRealignMsg({ ok: false, text: "Couldn't revert — please try again." });
    } finally {
      setRealignBusy(false);
    }
  }

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
    if (triggering || modelGated) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      await cytapi.agentTrigger(agentType, companyId);
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
        <div className="min-w-0">
          <div className="text-[13px] text-mut">{role}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-dim">
            {profile?.model && (
              <code className="rounded bg-panel2 px-1 py-0.5 text-[11px] text-mut">
                {profile.model}
              </code>
            )}
            {profile?.version && (
              <code
                className="rounded bg-panel2 px-1 py-0.5 text-[11px] text-mut"
                title="Current profile version (role + prompt + skills + loops). Each run is stamped with the version it executed against."
              >
                profile {profile.version}
                {profile.prompt.override_active &&
                profile.prompt.override_version != null
                  ? ` · override v${profile.prompt.override_version}`
                  : ""}
              </code>
            )}
            <span>
              Startup ritual ·{" "}
              <code className="rounded bg-panel2 px-1 py-0.5 text-[11px] text-mut">
                {startupFile}
              </code>
            </span>
          </div>
          {profile?.cadence && (
            <div className="mt-0.5 text-[11.5px] text-dim">{profile.cadence}</div>
          )}
        </div>
        <button
          onClick={runNow}
          disabled={triggering || modelGated}
          title={
            modelGated
              ? "Connect a model to activate your agents"
              : "Kick a one-off run of this agent for this topic"
          }
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
      {modelGated && <ConnectModelPrompt />}
      {triggerMsg && <div className="text-[12px] text-good">{triggerMsg}</div>}

      {profile?.prompt.override_active && (
        <div className="rounded-lg border border-[#223257] bg-brand/10 px-3 py-2 text-[12px] text-brand">
          A custom prompt is realigning this agent. Manage it in the Realign tab.
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-dim">
          Skills
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((sk) => (
            <span
              key={sk.key}
              title={sk.description || undefined}
              className="rounded-full border border-[#223257] bg-[#16203a] px-2.5 py-1 text-[11px] text-brand"
            >
              {sk.name}
            </span>
          ))}
        </div>
      </div>

      {loops.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-dim">
            Loops
          </div>
          <div className="space-y-1.5">
            {loops.map((lp) => (
              <div
                key={lp.key}
                className="rounded-lg border border-line bg-panel2 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">
                    {lp.name}
                  </span>
                  {lp.proposed && (
                    <span className="rounded-full border border-[#3a2f12] bg-[#1c160a] px-2 py-0.5 text-[10px] uppercase tracking-wide text-warn">
                      Proposed
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-dim">{lp.trigger}</div>
                <div className="mt-1 text-[12px] text-mut">{lp.behavior}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div className="flex flex-wrap gap-5 text-[12px]">
          <span className="text-mut">
            <span className="text-ink">{stats.runs_total}</span> runs
          </span>
          <span className="text-mut">
            <span className="text-ink">{stats.tasks_pending}</span> queued
          </span>
          <span className="text-mut">
            <span className="text-ink">{stats.tasks_total}</span> tasks
          </span>
          <span className="text-mut">
            <span className="text-ink">${stats.cost_usd}</span> spend
          </span>
        </div>
      )}

      {/* Queue / Add context / Realign tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-panel2 p-1">
        <button
          type="button"
          onClick={() => setTab("queue")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "queue"
              ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
              : "text-mut hover:text-ink"
          }`}
        >
          Queue
        </button>
        <button
          type="button"
          onClick={() => setTab("context")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "context"
              ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
              : "text-mut hover:text-ink"
          }`}
        >
          Add context
        </button>
        <button
          type="button"
          onClick={() => setTab("realign")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            tab === "realign"
              ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
              : "text-mut hover:text-ink"
          }`}
        >
          Realign
        </button>
      </div>

      {tab === "queue" ? (
        <>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-dim">
          Queue ({queue.length}) — assigned by the team lead, by priority
        </div>

        {review && (
          <div className="mb-2 rounded-[10px] border border-[#3a2f12] bg-[#1c160a] p-3">
            <div className="text-[12px] font-medium text-warn">
              Winslow review
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

        {queue.length === 0 ? (
          <div className="py-2 text-[12px] text-dim">Nothing queued.</div>
        ) : (
          queue.map((t) => (
            <div
              key={t.id}
              className="mb-2 rounded-lg border border-line bg-panel2 p-3 last:mb-0"
            >
              {/* Request */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-dim">
                    Request
                  </div>
                  <div className="text-[13px] font-semibold text-ink">
                    {t.title}
                  </div>
                </div>
                <StatusPill s={t.status} />
              </div>

              {/* Result */}
              {t.result && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wide text-dim">
                    Result
                  </div>
                  <div className="text-[12.5px] text-ink/90">{t.result}</div>
                </div>
              )}

              {/* Prompt / context */}
              {t.prompt && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-dim">
                    Prompt / context
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-panel p-2 text-[11px] text-mut">
                    {t.prompt}
                  </pre>
                </details>
              )}

              {/* Stats: model · duration · tokens · cost */}
              {(t.model ||
                t.duration_secs != null ||
                t.tokens_used != null ||
                t.cost_usd != null) && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-dim">
                  {t.model && <span className="text-mut">{t.model}</span>}
                  {t.duration_secs != null && <span>{t.duration_secs}s</span>}
                  {t.tokens_used != null && <span>{t.tokens_used} tokens</span>}
                  {t.cost_usd != null && <span>${t.cost_usd}</span>}
                  {t.profile_version && (
                    <span title="Agent profile version this run executed against">
                      profile {t.profile_version}
                    </span>
                  )}
                  {t.override_version != null && (
                    <span title="Realign-override version this run executed against">
                      override v{t.override_version}
                    </span>
                  )}
                </div>
              )}

              {/* Meta + prioritize */}
              <div className="mt-2 flex items-center justify-between gap-2">
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
                    title="Ask Winslow to move this up (and any blocking dependencies)"
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
          Process ({runs.length}) — what it did, run by run
        </div>
        {runs.length === 0 ? (
          <div className="py-2 text-[12px] text-dim">No runs yet.</div>
        ) : (
          runs.map((r) => (
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
        {actions.length === 0 ? (
          <div className="py-2 text-[12px] text-dim">No actions yet.</div>
        ) : (
          actions.map((a) => (
            <div key={a.id} className="border-b border-line py-1.5 last:border-0">
              <span className="text-[13px] text-ink">{a.summary}</span>
              <span className="ml-2 text-[11px] text-dim">
                {fmtTime(a.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
        </>
      ) : tab === "context" ? (
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-dim">
            Add context for {label(agentType)}
          </div>
          <textarea
            className="cyt-input min-h-[110px]"
            value={ctxText}
            onChange={(e) => setCtxText(e.target.value)}
            placeholder="Anything this agent should know — goals, constraints, tone…"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={saveContext}
              disabled={ctxBusy || !ctxText.trim()}
              className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-bg disabled:opacity-60"
            >
              {ctxBusy ? <Loader2 size={14} className="animate-spin" /> : null}
              Save context
            </button>
            {ctxMsg && (
              <span
                className={`text-[12px] ${ctxMsg.ok ? "text-good" : "text-bad"}`}
              >
                {ctxMsg.text}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-dim">
            Realign {label(agentType)} with a new prompt
          </div>

          {profile?.prompt.summary && (
            <div className="mb-3 rounded-lg border border-line bg-panel2 p-3">
              <div className="text-[10px] uppercase tracking-wide text-dim">
                Built-in mandate
              </div>
              <div className="mt-0.5 text-[12px] text-mut">
                {profile.prompt.summary}
              </div>
            </div>
          )}

          {override ? (
            <div className="mb-3 rounded-lg border border-[#223257] bg-brand/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-brand">
                  Active override{override.name ? ` · ${override.name}` : ""}
                </span>
                <button
                  type="button"
                  onClick={revertRealign}
                  disabled={realignBusy}
                  title="Delete the override and revert to the built-in prompt"
                  className="shrink-0 rounded-lg border border-[#223257] px-2.5 py-1 text-[12px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
                >
                  Revert to built-in
                </button>
              </div>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-panel p-2 text-[11px] text-mut">
                {override.content}
              </pre>
            </div>
          ) : (
            <div className="mb-3 text-[12px] text-dim">
              No override — this agent runs on its built-in prompt.
            </div>
          )}

          <textarea
            className="cyt-input min-h-[130px]"
            value={realignText}
            onChange={(e) => setRealignText(e.target.value)}
            placeholder="Write a new system prompt to steer this agent. It replaces the built-in prompt (fail-safe: revert any time)."
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={realign}
              disabled={realignBusy || !realignText.trim() || !companyId}
              className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-bg disabled:opacity-60"
            >
              {realignBusy ? <Loader2 size={14} className="animate-spin" /> : null}
              Realign agent
            </button>
            {realignMsg && (
              <span
                className={`text-[12px] ${realignMsg.ok ? "text-good" : "text-bad"}`}
              >
                {realignMsg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
