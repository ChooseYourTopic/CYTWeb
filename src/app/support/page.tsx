"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  LifeBuoy,
  Send,
  MessageSquare,
  Flag,
  Rocket,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  ApiError,
  type SupportTicket,
  type TicketThread,
  type TicketMessage,
  type MyTopic,
} from "@/lib/api";

/* -------------------------------- helpers --------------------------------- */

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (abs < min) return "just now";
  if (abs < hr) {
    const n = Math.round(abs / min);
    return `${n} min${n === 1 ? "" : "s"} ago`;
  }
  if (abs < day) {
    const n = Math.round(abs / hr);
    return `${n} hour${n === 1 ? "" : "s"} ago`;
  }
  if (abs < 30 * day) {
    const n = Math.round(abs / day);
    return `${n} day${n === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

function statusClass(status: SupportTicket["status"]): string {
  switch (status) {
    case "open":
      return "border-[#1f3d2e] bg-[#0e1c16] text-good";
    case "pending":
      return "border-[#3a2f12] bg-[#1c160a] text-warn";
    case "resolved":
      return "border-line bg-panel2 text-mut";
    case "closed":
      return "border-line bg-panel2 text-dim";
  }
}

function StatusChip({ status }: { status: SupportTicket["status"] }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass(
        status,
      )}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function SupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [topics, setTopics] = useState<MyTopic[]>([]);

  // New-request form
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // Open thread
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    try {
      await cytapi.me();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't load your support requests.");
      setLoading(false);
      return;
    }
    try {
      const list = await cytapi.support.myTickets();
      setTickets(list.data);
    } catch {
      setError("Couldn't load your support requests.");
    }
    // Best-effort — a failure here shouldn't block the page.
    try {
      const mine = await cytapi.myTopics();
      setTopics(mine.topics);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshList() {
    try {
      const list = await cytapi.support.myTickets();
      setTickets(list.data);
    } catch {
      /* keep the existing list on a transient failure */
    }
  }

  async function openTicket(id: number) {
    setThreadLoading(true);
    setThread(null);
    setReply("");
    try {
      const t = await cytapi.support.ticket(id);
      setThread(t);
    } catch {
      setFormMsg({ ok: false, text: "Couldn't open that request." });
    } finally {
      setThreadLoading(false);
    }
  }

  async function submitNew() {
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b || creating) return;
    setCreating(true);
    setFormMsg(null);
    try {
      const created = await cytapi.support.create({
        subject: s,
        body: b,
        ...(topicId ? { company_id: Number(topicId) } : {}),
      });
      setSubject("");
      setBody("");
      setTopicId("");
      setTickets((prev) => [created.ticket, ...prev]);
      setThread(created);
      setReply("");
      setFormMsg({ ok: true, text: "Request sent — we'll be in touch." });
    } catch {
      setFormMsg({ ok: false, text: "Couldn't send that request. Please try again." });
    } finally {
      setCreating(false);
    }
  }

  async function submitReply() {
    const b = reply.trim();
    if (!b || replying || !thread) return;
    setReplying(true);
    try {
      const updated = await cytapi.support.reply(thread.ticket.id, b);
      setThread(updated);
      setReply("");
      await refreshList();
    } catch {
      setFormMsg({ ok: false, text: "Couldn't send your reply. Please try again." });
    } finally {
      setReplying(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1180px] px-6 pb-24">
        <SiteHeader />
        <div className="mx-auto mt-16 flex max-w-[720px] items-center gap-2 text-mut">
          <Loader2 size={16} className="animate-spin" /> Loading your support requests…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />
      <section className="mx-auto mt-12 max-w-[720px]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to your topics
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-[28px] font-bold tracking-[-0.5px]">
          <LifeBuoy size={24} className="text-brand" /> Support
        </h1>
        <p className="mt-1 text-[14px] text-mut">
          Ask a question or report an issue — our support team picks these up and
          replies right here.
        </p>

        {/* The ticketing hub: support tickets, the roadmap, and release notes are
            one connected section. (Admin licensing / access lives here too.) */}
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-[13px] text-mut transition-colors hover:text-ink"
          >
            <Flag size={14} /> Roadmap
          </Link>
          <Link
            href="/releases"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-[13px] text-mut transition-colors hover:text-ink"
          >
            <Rocket size={14} /> Release notes
          </Link>
        </nav>

        {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}

        {/* New request */}
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <MessageSquare size={16} className="text-brand" /> New request
          </div>
          <p className="mt-1 text-[13px] text-mut">
            Tell us what&apos;s going on and we&apos;ll get back to you.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                Subject
              </span>
              <input
                className="cyt-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. My agents stopped mid-cycle"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                How can we help?
              </span>
              <textarea
                className="cyt-input min-h-[120px] resize-y"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe what you're seeing, and what you expected."
              />
            </label>
            {topics.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                  Which topic is this about? (optional)
                </span>
                <select
                  className="cyt-input"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                >
                  <option value="">None — general question</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={submitNew}
              disabled={creating || !subject.trim() || !body.trim()}
              className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {creating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Send request
            </button>
            {formMsg && (
              <span
                className={`text-[13px] ${formMsg.ok ? "text-good" : "text-bad"}`}
              >
                {formMsg.text}
              </span>
            )}
          </div>
        </div>

        {/* Thread view */}
        {(thread || threadLoading) && (
          <div className="mt-4 rounded-2xl border border-line bg-panel p-5">
            {threadLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-mut">
                <Loader2 size={15} className="animate-spin" /> Loading conversation…
              </div>
            ) : thread ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-ink">
                      {thread.ticket.subject}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-dim">
                      <StatusChip status={thread.ticket.status} />
                      <span>
                        {thread.ticket.messages_count} message
                        {thread.ticket.messages_count === 1 ? "" : "s"}
                      </span>
                      <span>· {relativeTime(thread.ticket.last_activity_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setThread(null)}
                    className="rounded-xl border border-line bg-panel2 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-[#31384c]"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  {thread.messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </div>

                {thread.ticket.status !== "closed" && (
                  <div className="mt-4 border-t border-line pt-4">
                    <textarea
                      className="cyt-input min-h-[80px] resize-y"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply…"
                    />
                    <div className="mt-3">
                      <button
                        onClick={submitReply}
                        disabled={replying || !reply.trim()}
                        className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
                      >
                        {replying ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        Send reply
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Ticket list */}
        <div className="mt-8">
          <h2 className="text-[15px] font-semibold text-ink">Your requests</h2>
          {tickets.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-line bg-panel p-5 text-[13px] text-mut">
              No requests yet — open one above and our support team will pick it up.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border bg-panel p-4 text-left transition-colors hover:border-[#31384c] ${
                    thread?.ticket.id === t.id
                      ? "border-[#31384c]"
                      : "border-line"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-ink">
                      {t.subject}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-dim">
                      <span>
                        {t.messages_count} message
                        {t.messages_count === 1 ? "" : "s"}
                      </span>
                      <span>· {relativeTime(t.last_activity_at ?? t.created_at)}</span>
                      {t.priority === "high" || t.priority === "urgent" ? (
                        <span className="text-warn">· {t.priority}</span>
                      ) : null}
                    </div>
                  </div>
                  <StatusChip status={t.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ------------------------------- message ---------------------------------- */

function MessageBubble({ message }: { message: TicketMessage }) {
  const isUser = message.author_role === "user";
  const isSystem = message.author_role === "system";

  if (isSystem) {
    return (
      <div className="text-center text-[12px] text-dim">
        {message.body} · {relativeTime(message.created_at)}
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        {!isUser && (
          <div className="mb-1 text-[11px] font-medium text-brand">
            {message.author_name ?? "Support"}
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13.5px] ${
            isUser
              ? "bg-panel2 text-ink"
              : "border border-[#2a2547] bg-[#161331] text-ink"
          }`}
        >
          {message.body}
        </div>
        <div
          className={`mt-1 text-[11px] text-dim ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {relativeTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
