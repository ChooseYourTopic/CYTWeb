"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  LogOut,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  FolderOpen,
  Settings,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  ApiError,
  type MeProfile,
  type MyTopic,
  type TopicReviewStatus,
} from "@/lib/api";

/** Visual treatment per review status. */
const STATUS: Record<
  TopicReviewStatus,
  { label: string; className: string; Icon: typeof Clock }
> = {
  queued: {
    label: "Queued",
    className: "border-line bg-panel2 text-mut",
    Icon: Clock,
  },
  reviewing: {
    label: "In review",
    className: "border-[#31384c] bg-panel2 text-warn",
    Icon: Search,
  },
  reviewed: {
    label: "Reviewed",
    className: "border-[#1f3d2e] bg-[#0e1c16] text-good",
    Icon: CheckCircle2,
  },
};

function StatusBadge({ status }: { status: TopicReviewStatus }) {
  const s = STATUS[status] ?? STATUS.queued;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${s.className}`}
    >
      <s.Icon size={12} />
      {s.label}
    </span>
  );
}

function TopicCard({ t }: { t: MyTopic }) {
  const pct =
    t.tasks_total > 0
      ? Math.round((t.tasks_completed / t.tasks_total) * 100)
      : 0;
  return (
    <Link
      href={`/topic/${t.id}`}
      className="group block rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-[#31384c]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-ink">{t.name}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] text-mut">{t.topic}</p>
        </div>
        <StatusBadge status={t.status} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-[12px] text-dim">
        <span>
          <span className="text-ink">{t.findings}</span> findings
        </span>
        <span>
          <span className="text-ink">{t.tasks_completed}</span>/{t.tasks_total}{" "}
          tasks
        </span>
        {t.tasks_pending > 0 && (
          <span className="text-warn">{t.tasks_pending} in progress</span>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-end text-[13px] text-brand opacity-0 transition-opacity group-hover:opacity-100">
        Open dashboard <ArrowRight size={14} className="ml-1" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeProfile | null>(null);
  const [topics, setTopics] = useState<MyTopic[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profile, mine] = await Promise.all([
        cytapi.me(),
        cytapi.myTopics(),
      ]);
      setMe(profile);
      setTopics(mine.topics);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function createTopic() {
    const topic = newTopic.trim();
    if (!topic || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await cytapi.createTopic(topic);
      router.push(`/topic/${res.topic_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't start that topic. Please try again.");
      setCreating(false);
    }
  }

  async function signOut() {
    try {
      await cytapi.auth.logout();
    } catch {
      /* ignore — clear locally regardless */
    }
    router.replace("/signin");
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />

      <section className="mx-auto mt-12 max-w-[860px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.5px]">
              Your topics
            </h1>
            <p className="mt-1 text-[14px] text-mut">
              {me?.phone ? (
                <>
                  Signed in as <span className="text-ink">{me.phone}</span>
                </>
              ) : (
                "Every topic you've started and how its review is going."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-[13px] text-mut transition-colors hover:text-ink"
            >
              <Settings size={14} /> Settings
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-[13px] text-mut transition-colors hover:text-ink"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>

        {/* Start a new topic */}
        <div className="mt-6 rounded-2xl border border-line bg-panel p-4">
          <label className="block text-[12px] uppercase tracking-wider text-dim">
            Start a new topic
          </label>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-xl border border-line bg-panel2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
              placeholder="e.g. a subscription box for rare houseplants"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTopic();
              }}
            />
            <button
              onClick={createTopic}
              disabled={creating || !newTopic.trim()}
              className="cyt-gradient-bg flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} strokeWidth={2.5} />
              )}
              {creating ? "Starting…" : "Start"}
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}

        {/* Topics list */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 py-16 text-mut">
              <Loader2 size={16} className="animate-spin" /> Loading your topics…
            </div>
          ) : topics && topics.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {topics.map((t) => (
                <TopicCard key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-panel/50 py-16 text-center">
              <FolderOpen size={28} className="mx-auto text-dim" />
              <p className="mt-3 text-[15px] text-ink">No topics yet</p>
              <p className="mt-1 text-[13px] text-mut">
                Start your first topic above and the agent team gets to work.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
