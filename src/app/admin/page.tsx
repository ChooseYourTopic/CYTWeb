"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  LifeBuoy,
  LayoutDashboard,
  Users,
  Building2,
  Activity,
  ShieldCheck,
  Send,
  UserCheck,
  UserPlus,
  UserMinus,
  Search,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  ApiError,
  type StaffWhoami,
  type AdminOverview,
  type AdminUserRow,
  type AdminCompanyRow,
  type SupportTicket,
  type TicketThread,
  type TicketMessage,
  type QueueCounts,
  type ActivityEvent,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/api";

/* -------------------------------- helpers --------------------------------- */

/** Compact relative time — "just now", "3m ago", "2h ago", "5d ago". */
function relTime(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function usd(n?: number | null): string {
  const v = typeof n === "number" ? n : 0;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function num(n?: number | null): string {
  return (typeof n === "number" ? n : 0).toLocaleString();
}

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  urgent: "border-[#3d1f1f] bg-[#1c0e0e] text-bad",
  high: "border-[#3a2f12] bg-[#1c160a] text-warn",
  normal: "border-line bg-panel2 text-mut",
  low: "border-line bg-panel2 text-dim",
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "border-[#1f3d2e] bg-[#0e1c16] text-good",
  pending: "border-[#3a2f12] bg-[#1c160a] text-warn",
  resolved: "border-line bg-panel2 text-mut",
  closed: "border-line bg-panel2 text-dim",
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function PriorityChip({ p }: { p: TicketPriority }) {
  return <Chip className={PRIORITY_STYLE[p] ?? PRIORITY_STYLE.normal}>{p}</Chip>;
}

function StatusChip({ s }: { s: TicketStatus }) {
  return <Chip className={STATUS_STYLE[s] ?? STATUS_STYLE.open}>{s}</Chip>;
}

/* ------------------------------- shell / tabs ----------------------------- */

type TabKey = "support" | "overview" | "users" | "companies" | "activity";

const TABS: { key: TabKey; label: string; Icon: typeof LifeBuoy }[] = [
  { key: "support", label: "Support queue", Icon: LifeBuoy },
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "users", label: "Users", Icon: Users },
  { key: "companies", label: "Companies", Icon: Building2 },
  { key: "activity", label: "Activity", Icon: Activity },
];

export default function AdminPage() {
  const router = useRouter();
  const [whoami, setWhoami] = useState<StaffWhoami | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("support");

  useEffect(() => {
    let alive = true;
    cytapi.admin
      .whoami()
      .then((w) => {
        if (alive) {
          setWhoami(w);
          setLoading(false);
        }
      })
      .catch(() => {
        router.replace("/signin");
      });
    return () => {
      alive = false;
    };
  }, [router]);

  if (loading || !whoami) {
    return (
      <main className="mx-auto max-w-[1180px] px-6 pb-24">
        <SiteHeader />
        <div className="mx-auto mt-16 flex max-w-[640px] items-center gap-2 text-mut">
          <Loader2 size={16} className="animate-spin" /> Loading the portal…
        </div>
      </main>
    );
  }

  const isAdmin = whoami.is_admin;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />

      <div className="mt-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to your topics
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[28px] font-bold tracking-[-0.5px]">
              <ShieldCheck size={22} className="text-brand" /> Admin portal
            </h1>
            <p className="mt-1 text-[14px] text-mut">
              Signed in as {whoami.name ?? whoami.email ?? "staff"} ·{" "}
              <span className={isAdmin ? "text-brand" : "text-good"}>
                {isAdmin ? "Administrator" : "Support agent"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <nav className="mt-6 flex flex-wrap gap-1 rounded-xl border border-line bg-panel2 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
              tab === t.key
                ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
                : "text-mut hover:text-ink"
            }`}
          >
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "support" && <SupportQueue whoami={whoami} />}
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab isAdmin={isAdmin} />}
        {tab === "companies" && <CompaniesTab />}
        {tab === "activity" && <ActivityTab />}
      </div>
    </main>
  );
}

/* ----------------------------- Support queue ------------------------------ */

type StatusFilter = "active" | "open" | "pending" | "resolved" | "closed";
type AssigneeFilter = "all" | "me" | "unassigned";

function SupportQueue({ whoami }: { whoami: StaffWhoami }) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const [priority, setPriority] = useState<"" | TicketPriority>("");
  const [q, setQ] = useState("");

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const loadQueue = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await cytapi.admin.queue({
        status,
        assignee,
        priority: priority || undefined,
        q: q.trim() || undefined,
      });
      setTickets(res.data);
      setCounts(res.counts);
    } catch (e) {
      setListError(
        e instanceof ApiError ? "Couldn't load the queue." : "Couldn't load the queue.",
      );
    } finally {
      setListLoading(false);
    }
  }, [status, assignee, priority, q]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const openTicket = useCallback(async (id: number) => {
    setSelectedId(id);
    setThreadLoading(true);
    try {
      setThread(await cytapi.admin.ticket(id));
    } catch {
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // After any mutation: refresh the open thread + the queue list & counts.
  const refreshAfterMutation = useCallback(
    async (id: number) => {
      await Promise.all([openTicket(id), loadQueue()]);
    },
    [openTicket, loadQueue],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* LEFT: filters + list */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        {/* Count badges */}
        {counts && (
          <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
            <CountBadge label="Unassigned" value={counts.unassigned} tone="warn" />
            <CountBadge label="Mine" value={counts.mine} tone="brand" />
            <CountBadge label="Open" value={counts.open} tone="good" />
            <CountBadge label="Pending" value={counts.pending} tone="mut" />
            <CountBadge label="Resolved today" value={counts.resolved_today} tone="mut" />
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <select
            className="cyt-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Status filter"
          >
            <option value="active">Active</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="cyt-input"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value as AssigneeFilter)}
            aria-label="Assignee filter"
          >
            <option value="all">All assignees</option>
            <option value="me">Mine</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <select
            className="cyt-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "" | TicketPriority)}
            aria-label="Priority filter"
          >
            <option value="">Any priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={loadQueue}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c]"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="relative mt-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            className="cyt-input pl-9"
            placeholder="Search subject or requester…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="mt-3 max-h-[640px] space-y-2 overflow-y-auto pr-0.5">
          {listLoading ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-mut">
              <Loader2 size={15} className="animate-spin" /> Loading tickets…
            </div>
          ) : listError ? (
            <p className="py-8 text-center text-[13px] text-bad">{listError}</p>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-mut">
              <Inbox size={22} className="text-dim" />
              <p className="text-[13px]">No tickets in the queue</p>
            </div>
          ) : (
            tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                active={t.id === selectedId}
                onClick={() => openTicket(t.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT: thread */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        {selectedId == null ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-mut">
            <LifeBuoy size={26} className="text-dim" />
            <p className="text-[14px]">Select a ticket to view the conversation</p>
          </div>
        ) : threadLoading && !thread ? (
          <div className="flex items-center gap-2 py-8 text-[13px] text-mut">
            <Loader2 size={15} className="animate-spin" /> Loading conversation…
          </div>
        ) : thread ? (
          <TicketThreadPane
            thread={thread}
            currentUserId={whoami.id}
            onMutated={() => refreshAfterMutation(selectedId)}
          />
        ) : (
          <p className="py-8 text-center text-[13px] text-bad">
            Couldn&apos;t load this ticket.
          </p>
        )}
      </div>
    </div>
  );
}

function CountBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warn" | "brand" | "good" | "mut";
}) {
  const toneCls =
    tone === "warn"
      ? "text-warn"
      : tone === "brand"
        ? "text-brand"
        : tone === "good"
          ? "text-good"
          : "text-mut";
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel2 px-2 py-1">
      <span className={`font-bold ${toneCls}`}>{value}</span>
      <span className="text-dim">{label}</span>
    </span>
  );
}

function TicketRow({
  ticket,
  active,
  onClick,
}: {
  ticket: SupportTicket;
  active: boolean;
  onClick: () => void;
}) {
  const requester =
    ticket.user?.name || ticket.user?.email || ticket.user?.phone || "Unknown";
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-[#31384c] bg-panel2"
          : "border-line bg-panel2/40 hover:border-[#31384c]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-[13.5px] font-semibold text-ink">
          {ticket.subject || "(no subject)"}
        </span>
        <span className="shrink-0 text-[11px] text-dim">
          {relTime(ticket.last_activity_at)}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <PriorityChip p={ticket.priority} />
        <StatusChip s={ticket.status} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-mut">
        <span className="truncate">{requester}</span>
        <span className="shrink-0 text-dim">
          {ticket.assignee?.name ? ticket.assignee.name : "Unassigned"} ·{" "}
          {ticket.messages_count} msg
        </span>
      </div>
    </button>
  );
}

function TicketThreadPane({
  thread,
  currentUserId,
  onMutated,
}: {
  thread: TicketThread;
  currentUserId: number;
  onMutated: () => void | Promise<void>;
}) {
  const { ticket, messages } = thread;
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<null | "reply" | "assign" | "status" | "priority">(
    null,
  );

  const isMine = ticket.assignee?.id === currentUserId;

  async function sendReply() {
    const body = reply.trim();
    if (!body || busy) return;
    setBusy("reply");
    try {
      await cytapi.admin.reply(ticket.id, body);
      setReply("");
      await onMutated();
    } finally {
      setBusy(null);
    }
  }

  async function claim() {
    if (busy) return;
    setBusy("assign");
    try {
      await cytapi.admin.assign(ticket.id, { me: true });
      await onMutated();
    } finally {
      setBusy(null);
    }
  }

  async function unassign() {
    if (busy) return;
    setBusy("assign");
    try {
      await cytapi.admin.assign(ticket.id, { unassign: true });
      await onMutated();
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (busy) return;
    setBusy("status");
    try {
      await cytapi.admin.setTicketStatus(ticket.id, { status });
      await onMutated();
    } finally {
      setBusy(null);
    }
  }

  async function changePriority(priority: TicketPriority) {
    if (busy) return;
    setBusy("priority");
    try {
      await cytapi.admin.setTicketStatus(ticket.id, { priority });
      await onMutated();
    } finally {
      setBusy(null);
    }
  }

  const requester =
    ticket.user?.name || ticket.user?.email || ticket.user?.phone || "Unknown";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-line pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.3px] text-ink">
              {ticket.subject || "(no subject)"}
            </h2>
            <p className="mt-0.5 text-[12px] text-mut">
              #{ticket.id} · {ticket.category || "general"} · from {requester}
              {ticket.company?.name ? ` · ${ticket.company.name}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <PriorityChip p={ticket.priority} />
            <StatusChip s={ticket.status} />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isMine ? (
            <button
              onClick={unassign}
              disabled={busy != null}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c] disabled:opacity-60"
            >
              {busy === "assign" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserCheck size={14} className="text-good" />
              )}
              Assigned to you · Release
            </button>
          ) : (
            <button
              onClick={claim}
              disabled={busy != null}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c] disabled:opacity-60"
            >
              {busy === "assign" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserCheck size={14} />
              )}
              {ticket.assignee?.name ? `Claim from ${ticket.assignee.name}` : "Claim"}
            </button>
          )}

          <label className="flex items-center gap-1.5 text-[12px] text-dim">
            Status
            <select
              className="cyt-input !w-auto !py-1.5 text-[13px]"
              value={ticket.status}
              onChange={(e) => changeStatus(e.target.value as TicketStatus)}
              disabled={busy != null}
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[12px] text-dim">
            Priority
            <select
              className="cyt-input !w-auto !py-1.5 text-[13px]"
              value={ticket.priority}
              onChange={(e) => changePriority(e.target.value as TicketPriority)}
              disabled={busy != null}
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-[240px] flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-mut">No messages yet.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} msg={m} />)
        )}
      </div>

      {/* Reply */}
      <div className="border-t border-line pt-3">
        <textarea
          className="cyt-input min-h-[76px] resize-y"
          placeholder="Write a reply…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply();
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-dim">⌘/Ctrl + Enter to send</span>
          <button
            onClick={sendReply}
            disabled={busy != null || !reply.trim()}
            className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
          >
            {busy === "reply" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            Send reply
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: TicketMessage }) {
  const isStaff = msg.author_role === "support";
  const isSystem = msg.author_role === "system";

  if (isSystem) {
    return (
      <div className="mx-auto max-w-[80%] text-center text-[12px] text-dim">
        {msg.body} · {relTime(msg.created_at)}
      </div>
    );
  }

  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl border px-3.5 py-2.5 ${
          isStaff
            ? "border-[#2a3350] bg-[#141a2e] text-ink"
            : "border-line bg-panel2 text-ink"
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px]">
          <span className={`font-semibold ${isStaff ? "text-brand" : "text-mut"}`}>
            {msg.author_name || (isStaff ? "Support" : "User")}
          </span>
          <span className="text-dim">{relTime(msg.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{msg.body}</p>
      </div>
    </div>
  );
}

/* -------------------------------- Overview -------------------------------- */

function OverviewTab() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    cytapi.admin
      .overview()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => setError("Couldn't load the overview."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <PanelLoading label="Loading overview…" />;
  if (error || !data) return <PanelError text={error ?? "No data."} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Companies" value={num(data.companies)} icon={Building2} />
        <StatTile label="Users" value={num(data.users)} icon={Users} />
        <StatTile label="Admins" value={num(data.admins)} icon={ShieldCheck} />
        <StatTile label="Agent runs today" value={num(data.agent_runs.today)} icon={Activity} />
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h3 className="text-[15px] font-semibold text-ink">Tasks</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Total" value={num(data.tasks.total)} />
          <MiniStat label="Pending" value={num(data.tasks.pending)} tone="warn" />
          <MiniStat label="Completed" value={num(data.tasks.completed)} tone="good" />
          <MiniStat label="Failed" value={num(data.tasks.failed)} tone="bad" />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <h3 className="text-[15px] font-semibold text-ink">Spend</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat label="Today" value={usd(data.spend.today_usd)} />
          <MiniStat label="All-time" value={usd(data.spend.all_time_usd)} />
          <MiniStat label="Tokens today" value={num(data.spend.tokens_today)} />
        </div>
        <p className="mt-4 text-[12.5px] text-mut">
          Mode:{" "}
          <span className={data.mode.agent_mock ? "text-warn" : "text-good"}>
            {data.mode.agent_mock ? "agent mock ON" : "live agents"}
          </span>{" "}
          ·{" "}
          <span className={data.mode.sandbox ? "text-warn" : "text-good"}>
            {data.mode.sandbox ? "sandbox ON" : "sandbox OFF"}
          </span>{" "}
          · daily budget {usd(data.mode.daily_budget_usd)}
        </p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider text-dim">
        <Icon size={13} className="text-brand" /> {label}
      </div>
      <div className="mt-2 text-[26px] font-bold tracking-[-0.5px] text-ink">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "good" | "bad";
}) {
  const toneCls =
    tone === "warn"
      ? "text-warn"
      : tone === "good"
        ? "text-good"
        : tone === "bad"
          ? "text-bad"
          : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-panel2 p-3">
      <div className="text-[11px] uppercase tracking-wider text-dim">{label}</div>
      <div className={`mt-1 text-[18px] font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}

/* --------------------------------- Users ---------------------------------- */

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cytapi.admin.users();
      setRows(res.data);
    } catch {
      setError("Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAdmin(u: AdminUserRow) {
    setBusyId(u.id);
    try {
      await cytapi.admin.setAdmin(u.id, !u.is_admin);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSupport(u: AdminUserRow) {
    setBusyId(u.id);
    try {
      await cytapi.admin.setSupport(u.id, !u.is_support);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function changeLicense(u: AdminUserRow, type: string) {
    setBusyId(u.id);
    try {
      await cytapi.admin.setLicense(u.id, { type });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PanelLoading label="Loading users…" />;
  if (error) return <PanelError text={error} />;
  if (rows.length === 0) return <PanelEmpty text="No users yet." />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wider text-dim">
            <Th>User</Th>
            <Th>Account</Th>
            <Th>Contact</Th>
            <Th>Roles</Th>
            <Th>License</Th>
            <Th className="text-right">Companies</Th>
            <Th>Joined</Th>
            {isAdmin && <Th className="text-right">Actions</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-line/60 last:border-0">
              <Td>
                <span className="font-semibold text-ink">{u.name ?? "—"}</span>
              </Td>
              <Td>
                <span className="font-mono text-[12px] text-dim">{u.account_number ?? "—"}</span>
              </Td>
              <Td>
                <span className="text-mut">{u.email ?? u.phone ?? "—"}</span>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {u.is_admin && (
                    <Chip className="border-line bg-panel2 text-brand">Admin</Chip>
                  )}
                  {u.is_support && (
                    <Chip className="border-line bg-panel2 text-good">Support</Chip>
                  )}
                  {!u.is_admin && !u.is_support && (
                    <Chip className="border-line bg-panel2 text-dim">User</Chip>
                  )}
                </div>
              </Td>
              <Td>
                <div className="flex flex-col gap-0.5">
                  {isAdmin ? (
                    <select
                      className="cyt-input h-8 min-w-[130px] py-1 text-[12px] disabled:opacity-50"
                      value={u.license?.type ?? "standard"}
                      disabled={busyId === u.id}
                      onChange={(e) => changeLicense(u, e.target.value)}
                    >
                      <option value="standard">Standard user</option>
                      <option value="business_owner">Business owner</option>
                      <option value="advertiser">Advertiser</option>
                      <option value="support">Support agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <Chip className="border-line bg-panel2 text-mut">
                      {u.license?.label ?? u.license?.type ?? "Standard user"}
                    </Chip>
                  )}
                  <span className="font-mono text-[11px] text-dim">
                    {u.license?.id ?? "—"}
                    {u.license?.status && u.license.status !== "active" && (
                      <span className="ml-1 text-warn">· {u.license.status}</span>
                    )}
                  </span>
                </div>
              </Td>
              <Td className="text-right text-mut">{num(u.companies)}</Td>
              <Td className="text-dim">{relTime(u.created_at)}</Td>
              {isAdmin && (
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <RoleToggle
                      active={u.is_admin}
                      busy={busyId === u.id}
                      onClick={() => toggleAdmin(u)}
                      grantLabel="Grant admin"
                      revokeLabel="Revoke admin"
                    />
                    <RoleToggle
                      active={u.is_support}
                      busy={busyId === u.id}
                      onClick={() => toggleSupport(u)}
                      grantLabel="Grant support"
                      revokeLabel="Revoke support"
                    />
                  </div>
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleToggle({
  active,
  busy,
  onClick,
  grantLabel,
  revokeLabel,
}: {
  active: boolean;
  busy: boolean;
  onClick: () => void;
  grantLabel: string;
  revokeLabel: string;
}) {
  const label = active ? revokeLabel : grantLabel;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={label}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
        active
          ? "border-[#3d1f1f] bg-[#1c0e0e] text-bad hover:border-[#5a2d2d]"
          : "border-line bg-panel2 text-mut hover:border-[#31384c] hover:text-ink"
      }`}
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" />
      ) : active ? (
        <UserMinus size={12} />
      ) : (
        <UserPlus size={12} />
      )}
      {label}
    </button>
  );
}

/* ------------------------------- Companies -------------------------------- */

function CompaniesTab() {
  const [rows, setRows] = useState<AdminCompanyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    cytapi.admin
      .companies()
      .then((res) => {
        if (alive) setRows(res.data);
      })
      .catch(() => setError("Couldn't load companies."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <PanelLoading label="Loading companies…" />;
  if (error) return <PanelError text={error} />;
  if (rows.length === 0) return <PanelEmpty text="No companies yet." />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wider text-dim">
            <Th>Company</Th>
            <Th>Topic</Th>
            <Th>Owner</Th>
            <Th className="text-right">Tasks</Th>
            <Th className="text-right">Agent runs</Th>
            <Th className="text-right">Spend</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-line/60 last:border-0">
              <Td>
                <span className="font-semibold text-ink">{c.name}</span>
              </Td>
              <Td>
                <span className="line-clamp-1 text-mut">{c.topic ?? "—"}</span>
              </Td>
              <Td>
                <span className="text-mut">
                  {c.owner?.name ?? c.owner?.email ?? c.owner?.phone ?? "—"}
                </span>
              </Td>
              <Td className="text-right text-mut">{num(c.tasks)}</Td>
              <Td className="text-right text-mut">{num(c.agent_runs)}</Td>
              <Td className="text-right font-semibold text-ink">{usd(c.spend_usd)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Activity -------------------------------- */

function ActivityTab() {
  const [rows, setRows] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    cytapi.admin
      .activity(100)
      .then((res) => {
        if (alive) setRows(res.data);
      })
      .catch(() => setError("Couldn't load activity."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <PanelLoading label="Loading activity…" />;
  if (error) return <PanelError text={error} />;
  if (rows.length === 0) return <PanelEmpty text="No recent activity." />;

  return (
    <div className="rounded-2xl border border-line bg-panel p-2">
      <ul className="divide-y divide-line/60">
        {rows.map((ev) => {
          const e = ev as ActivityEvent & {
            category?: string;
            message?: string;
          };
          const tag = e.category ?? e.agent_type ?? "event";
          const text = e.message ?? e.summary ?? e.action ?? "Activity";
          return (
            <li key={e.id} className="flex items-start gap-3 px-3 py-2.5">
              <span className="mt-0.5 shrink-0">
                <Chip className="border-line bg-panel2 text-dim">{tag}</Chip>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-ink">
                  {e.action ? (
                    <span className="font-semibold text-mut">{e.action}: </span>
                  ) : null}
                  {text}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-dim">
                {relTime(e.created_at)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------- shared table bits --------------------------- */

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-panel p-8 text-[13px] text-mut">
      <Loader2 size={15} className="animate-spin" /> {label}
    </div>
  );
}

function PanelError({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-8 text-center text-[13px] text-bad">
      {text}
    </div>
  );
}

function PanelEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-10 text-center text-[13px] text-mut">
      {text}
    </div>
  );
}
