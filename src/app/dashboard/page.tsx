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
  Pause,
  Play,
  Sparkles,
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

/** Amber pill shown in place of the review status when a project is paused. */
function PausedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4a3b1a] bg-[#1c1708] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warn">
      <Pause size={12} />
      Paused
    </span>
  );
}

function TopicCard({
  t,
  onToggle,
  busy,
}: {
  t: MyTopic;
  onToggle: (t: MyTopic) => void;
  busy: boolean;
}) {
  const paused = t.paused;
  const pct =
    t.tasks_total > 0
      ? Math.round((t.tasks_completed / t.tasks_total) * 100)
      : 0;
  return (
    <Link
      href={`/topic/${t.id}`}
      className={`group block rounded-2xl border bg-panel p-5 transition-all hover:border-[#31384c] ${
        paused ? "border-[#4a3b1a] opacity-70 hover:opacity-100" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-ink">{t.name}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] text-mut">{t.topic}</p>
        </div>
        {paused ? <PausedBadge /> : <StatusBadge status={t.status} />}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[12px] text-dim">
        <span>
          <span className="text-ink">{t.findings}</span> findings
        </span>
        <span>
          <span className="text-ink">{t.tasks_completed}</span>/{t.tasks_total}{" "}
          tasks
        </span>
        {t.tasks_pending > 0 && !paused && (
          <span className="text-warn">{t.tasks_pending} in progress</span>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className={`h-full rounded-full transition-all ${
            paused ? "bg-dim" : "bg-brand"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {/* Pause / Resume — toggles without following the card link. */}
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(t);
          }}
          title={
            paused
              ? "Resume this project — restore the agents where they left off"
              : "Pause this project — soft-shuts the agents down and saves their state"
          }
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60 ${
            paused
              ? "border-[#1f3d2e] bg-[#0e1c16] text-good hover:brightness-125"
              : "border-line bg-panel2 text-mut hover:text-ink"
          }`}
        >
          {busy ? (
            <Loader2 size={12} className="animate-spin" />
          ) : paused ? (
            <Play size={12} />
          ) : (
            <Pause size={12} />
          )}
          {paused ? "Resume" : "Pause"}
        </button>

        <span className="flex items-center text-[13px] text-brand opacity-0 transition-opacity group-hover:opacity-100">
          Open dashboard <ArrowRight size={14} className="ml-1" />
        </span>
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
  const [busyId, setBusyId] = useState<number | null>(null);

  /** Pause/resume a project against the server, with an optimistic flip. */
  const togglePause = useCallback(
    async (t: MyTopic) => {
      const next = !t.paused;
      setBusyId(t.id);
      setTopics((prev) =>
        prev?.map((x) => (x.id === t.id ? { ...x, paused: next } : x)) ?? prev,
      );
      try {
        const res = next
          ? await cytapi.pauseTopic(t.id)
          : await cytapi.resumeTopic(t.id);
        setTopics((prev) =>
          prev?.map((x) => (x.id === t.id ? res.topic : x)) ?? prev,
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/signin");
          return;
        }
        // Revert the optimistic change on failure.
        setTopics((prev) =>
          prev?.map((x) => (x.id === t.id ? { ...x, paused: t.paused } : x)) ??
          prev,
        );
        setError("Couldn't update that project. Please try again.");
      } finally {
        setBusyId(null);
      }
    },
    [router],
  );

  const load = useCallback(async () => {
    try {
      const [profile, mine] = await Promise.all([
        cytapi.me(),
        cytapi.myTopics(),
      ]);
      // First-run: a brand-new user (no topics, no persona) starts in the
      // two-step guided onboarding.
      if (mine.topics.length === 0 && !profile.preferences?.ai_experience) {
        router.replace("/start");
        return;
      }
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
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[14px] text-mut">
              {me?.display_name ? (
                <>
                  Signed in as{" "}
                  <span className="text-ink">{me.display_name}</span>
                </>
              ) : me ? (
                <>
                  Signed in ·{" "}
                  <Link href="/settings" className="text-brand hover:underline">
                    Set an account name
                  </Link>
                </>
              ) : (
                "Every topic you've started and how its review is going."
              )}
              {me?.joined_at && (
                <span className="text-dim">
                  · Member since{" "}
                  {new Date(me.joined_at).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
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
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mut">
            <Link
              href="/start"
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              <Sparkles size={13} /> New here? Get set up
            </Link>
            <span className="text-dim">·</span>
            <Link
              href="/choose"
              className="font-semibold text-brand hover:underline"
            >
              Browse topic ideas
            </Link>
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
                <TopicCard
                  key={t.id}
                  t={t}
                  onToggle={togglePause}
                  busy={busyId === t.id}
                />
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
