"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Flag,
  Rocket,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  type RoadmapEntry,
  type RoadmapLedger,
  type RoadmapStatus,
} from "@/lib/api";

/** Human labels + accent for each status the queue moves through. */
const STATUS_META: Record<RoadmapStatus, { label: string; cls: string }> = {
  proposed: { label: "Queued", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In progress", cls: "bg-blue-100 text-blue-700" },
  in_review: { label: "In review", cls: "bg-amber-100 text-amber-700" },
  shipped: { label: "Shipped", cls: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", cls: "bg-slate-100 text-slate-400" },
};

/**
 * The specialists a roadmap entry can be farmed out to — the keys of the API's
 * config/agents.php. The order is the assign-menu order.
 */
const AGENT_TYPES = [
  "orchestrator",
  "business_planning",
  "competitor_research",
  "social_media",
  "finance",
  "email_outreach",
  "customer_support",
  "ads_management",
  "code_generation",
  "winslow_prime",
  "front_end_developer",
  "back_end_developer",
  "email_marketing_analyst",
  "research_analyst",
  "brand_designer",
  "seo_specialist",
  "copywriter",
  "data_analyst",
] as const;

/** Hand-tuned human labels; anything else falls back to Title Case. */
const AGENT_LABELS: Record<string, string> = {
  unassigned: "Unassigned backlog",
  orchestrator: "Orchestrator (Winslow)",
  winslow_prime: "Winslow Prime",
  front_end_developer: "Front-end Developer",
  back_end_developer: "Back-end Developer",
  seo_specialist: "SEO Specialist",
  ads_management: "Ads Management",
};

function agentLabel(agentType: string): string {
  return (
    AGENT_LABELS[agentType] ??
    agentType
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function StatusPill({ status }: { status: RoadmapStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.proposed;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

/**
 * Inline assign menu on an entry — pick a specialist to farm it out to (or
 * "Unassign" to return it to the backlog). Calls back with the agent_type (null
 * to unassign); disabled while the ledger refetches.
 */
function AssignControl({
  entry,
  busy,
  onAssign,
}: {
  entry: RoadmapEntry;
  busy: boolean;
  onAssign: (agentType: string | null) => void;
}) {
  return (
    <select
      aria-label="Assign to agent"
      title="Assign this entry to a specialist"
      value={entry.agent_type ?? ""}
      disabled={busy}
      onChange={(e) => onAssign(e.target.value === "" ? null : e.target.value)}
      className="cyt-input h-7 w-[160px] shrink-0 text-[12px] disabled:opacity-40"
    >
      <option value="">Unassign</option>
      {AGENT_TYPES.map((a) => (
        <option key={a} value={a}>
          {agentLabel(a)}
        </option>
      ))}
    </select>
  );
}

/** The lifecycle the owner can move an entry through, in order, with human labels. */
const STATUS_STEPS: RoadmapStatus[] = [
  "proposed",
  "in_progress",
  "in_review",
  "shipped",
  "archived",
];

/**
 * Inline status menu on an entry — advance a deliverable through its lifecycle
 * (Queued → In progress → In review → Shipped, or Archived) right from the
 * roadmap. Calls back with the new status; disabled while the ledger refetches.
 */
function StatusControl({
  entry,
  busy,
  onSetStatus,
}: {
  entry: RoadmapEntry;
  busy: boolean;
  onSetStatus: (status: RoadmapStatus) => void;
}) {
  return (
    <select
      aria-label="Set status"
      title="Move this entry through its lifecycle"
      value={entry.status}
      disabled={busy}
      onChange={(e) => onSetStatus(e.target.value as RoadmapStatus)}
      className="cyt-input h-7 w-[130px] shrink-0 text-[12px] disabled:opacity-40"
    >
      {STATUS_STEPS.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}

function QueueRow({
  entry,
  control,
}: {
  entry: RoadmapEntry;
  control?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line/60 px-4 py-3 last:border-b-0">
      <span
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 text-[12px] font-bold text-brand"
        title={`Priority ${entry.priority}`}
      >
        P{entry.priority}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-ink">
            {entry.title}
          </span>
          <StatusPill status={entry.status} />
        </div>
        {entry.description && (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-mut">
            {entry.description}
          </p>
        )}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

/**
 * One collapsible agent group in the drill-down: header shows the agent + its
 * open/shipped/total rollup; expanded body is that agent's queue in order, each
 * row carrying its own assign control so entries can be re-farmed live.
 */
function AgentGroup({
  agentType,
  bucket,
  renderControl,
  defaultOpen,
}: {
  agentType: string;
  bucket: RoadmapLedger["by_agent"][string];
  renderControl: (entry: RoadmapEntry) => React.ReactNode;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isBacklog = agentType === "unassigned";
  return (
    <div className="border-b border-line/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-panel2"
      >
        {open ? (
          <ChevronDown size={15} className="shrink-0 text-mut" />
        ) : (
          <ChevronRight size={15} className="shrink-0 text-mut" />
        )}
        <span
          className={`truncate text-[14px] font-semibold ${
            isBacklog ? "text-mut" : "text-ink"
          }`}
        >
          {agentLabel(agentType)}
        </span>
        <span className="ml-auto shrink-0 text-[11.5px] text-mut">
          {bucket.counts.open} open · {bucket.counts.shipped} shipped ·{" "}
          {bucket.counts.total} total
        </span>
      </button>
      {open &&
        (bucket.queue.length > 0 ? (
          <div className="border-t border-line/60">
            {bucket.queue.map((e) => (
              <QueueRow key={e.id} entry={e} control={renderControl(e)} />
            ))}
          </div>
        ) : (
          <p className="border-t border-line/60 px-4 py-3 text-[13px] text-mut">
            Nothing open here — everything assigned has shipped.
          </p>
        ))}
    </div>
  );
}

export default function TopicRoadmapPage({
  params,
}: {
  params: { id: string };
}) {
  const [ledger, setLedger] = useState<RoadmapLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(3);
  const [placing, setPlacing] = useState(false);
  // The entry id currently being (re)assigned, so its control disables while the
  // ledger refetches.
  const [assigningId, setAssigningId] = useState<number | null>(null);
  // The entry id currently having its status advanced, so its control disables
  // while the ledger refetches.
  const [statusingId, setStatusingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLedger(await cytapi.roadmap(params.id));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || placing) return;
    setPlacing(true);
    try {
      await cytapi.placeRoadmapEntry(params.id, {
        title: title.trim(),
        priority,
      });
      setTitle("");
      setPriority(3);
      await load();
    } catch {
      /* fail-soft — the entry just won't appear */
    } finally {
      setPlacing(false);
    }
  }

  // Farm an entry out to a specialist (or unassign with null), then refetch so it
  // moves into that agent's queue live.
  const assign = useCallback(
    async (entryId: number, agentType: string | null) => {
      setAssigningId(entryId);
      try {
        await cytapi.assignRoadmapEntry(params.id, entryId, agentType);
        await load();
      } catch {
        /* fail-soft — keep the last-good ledger */
      } finally {
        setAssigningId(null);
      }
    },
    [params.id, load],
  );

  // Move an entry through its lifecycle (proposed → in_progress → in_review →
  // shipped / archived), then refetch so the next step + by-agent queues re-point
  // live (a shipped entry naturally drops out of the open queue).
  const setStatus = useCallback(
    async (entryId: number, status: RoadmapStatus) => {
      setStatusingId(entryId);
      try {
        await cytapi.setRoadmapEntryStatus(params.id, entryId, status);
        await load();
      } catch {
        /* fail-soft — keep the last-good ledger */
      } finally {
        setStatusingId(null);
      }
    },
    [params.id, load],
  );

  const renderControl = useCallback(
    (entry: RoadmapEntry) => (
      <div className="flex items-center gap-1.5">
        <StatusControl
          entry={entry}
          busy={statusingId === entry.id}
          onSetStatus={(status) => setStatus(entry.id, status)}
        />
        <AssignControl
          entry={entry}
          busy={assigningId === entry.id}
          onAssign={(agentType) => assign(entry.id, agentType)}
        />
      </div>
    ),
    [assign, assigningId, setStatus, statusingId],
  );

  const counts = ledger?.counts;

  // Order the drill-down: real agents first (config order), unassigned backlog last.
  const byAgentKeys = ledger
    ? Object.keys(ledger.by_agent).sort((a, b) => {
        if (a === "unassigned") return 1;
        if (b === "unassigned") return -1;
        const ia = (AGENT_TYPES as readonly string[]).indexOf(a);
        const ib = (AGENT_TYPES as readonly string[]).indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
    : [];

  return (
    <main className="mx-auto max-w-[860px] px-6 pb-16">
      <SiteHeader />

      <header className="mb-5 mt-8">
        <Link
          href={`/topic/${params.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to topic
        </Link>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-[-0.4px]">
            <Flag size={20} className="text-brand" /> Roadmap
          </h1>
          <Link
            href={`/topic/${params.id}/releases`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mut transition-colors hover:text-ink"
          >
            <Rocket size={14} /> Release notes
          </Link>
        </div>
        <p className="mt-1 text-[14px] text-mut">
          The work queue your team drains in priority order. Winslow advances it
          every cycle — you check in and nudge.
        </p>
        {counts && (
          <p className="mt-2 text-[12px] text-mut">
            {counts.open} in the queue · {counts.in_review} in review ·{" "}
            {counts.shipped} shipped
          </p>
        )}
      </header>

      {ledger?.next && (
        <Card className="mb-4 border-brand/30">
          <div className="px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand">
              Next up
            </div>
            <div className="mt-1 text-[15px] font-semibold text-ink">
              {ledger.next.title}
            </div>
            {ledger.next.description && (
              <p className="mt-0.5 text-[13px] text-mut">
                {ledger.next.description}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Nudge: place a new enhancement on the queue. */}
      <Card className="mb-4">
        <CardHeader>Add to the roadmap</CardHeader>
        <form onSubmit={place} className="flex flex-wrap items-center gap-2 p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="An enhancement to queue…"
            className="cyt-input min-w-[220px] flex-1"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="cyt-input w-[110px]"
            aria-label="Priority"
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                Priority {p}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!title.trim() || placing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            <Plus size={15} /> {placing ? "Adding…" : "Add"}
          </button>
        </form>
      </Card>

      <Card className="mb-4">
        <CardHeader>In the queue</CardHeader>
        {loading ? (
          <p className="p-4 text-[13px] text-mut">Loading the roadmap…</p>
        ) : error ? (
          <p className="p-4 text-[13px] text-mut">
            Couldn&apos;t load the roadmap. Try again shortly.
          </p>
        ) : ledger && ledger.queue.length > 0 ? (
          <div>
            {ledger.queue.map((e) => (
              <QueueRow key={e.id} entry={e} control={renderControl(e)} />
            ))}
          </div>
        ) : (
          <p className="p-4 text-[13px] text-mut">
            The queue is empty — nothing placed yet, or everything has shipped.
          </p>
        )}
      </Card>

      {/* Drill-down: project → roadmap → agent → queue → deliverable. Reads the
          stored per-agent slice; each row can be re-farmed to another specialist. */}
      {ledger && byAgentKeys.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} /> By agent
            </span>
          </CardHeader>
          <p className="px-4 pt-3 text-[12px] text-mut">
            Each specialist&apos;s own queue, in priority order. Expand a group to
            see its scope of work, or re-assign an entry to move it live.
          </p>
          <div className="mt-2">
            {byAgentKeys.map((agentType, i) => (
              <AgentGroup
                key={agentType}
                agentType={agentType}
                bucket={ledger.by_agent[agentType]}
                renderControl={renderControl}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </Card>
      )}

      {ledger && ledger.shipped.length > 0 && (
        <Card>
          <CardHeader>Shipped · release notes</CardHeader>
          <div>
            {ledger.shipped.map((e) => (
              <div
                key={e.id}
                className="border-b border-line/60 px-4 py-3 last:border-b-0"
              >
                <div className="text-[14px] font-semibold text-ink">
                  {e.title}
                </div>
                {e.release_note && (
                  <p className="mt-0.5 text-[13px] text-mut">
                    {e.release_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
