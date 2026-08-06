"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trophy,
  Medal,
  Search,
  Timer,
  Eye,
  MousePointerClick,
  Rocket,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  ApiError,
  type LeaderboardResponse,
  type LeaderboardEntry,
  type LeaderboardMetricSort,
  type MilestoneCatalogItem,
} from "@/lib/api";
import {
  MilestoneBadges,
  rankChipCls,
} from "@/components/research/BattlePassPanel";

const METRICS: { key: LeaderboardMetricSort; label: string }[] = [
  { key: "speed", label: "Fastest to milestones" },
  { key: "revenue", label: "Business milestones" },
  { key: "views", label: "Most views" },
  { key: "clicks", label: "Most clicks" },
  { key: "conversions", label: "Most conversions" },
];

/** One full-width row on the race board. */
function BoardRow({ e }: { e: LeaderboardEntry }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
        e.is_you ? "border-brand/60 bg-brand/10" : "border-line bg-panel2"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-bold tabular-nums ${rankChipCls(
          e.rank,
        )}`}
      >
        {(e.rank ?? 0) <= 3 ? <Medal size={15} /> : e.rank}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14px] font-bold text-ink">
            {e.name}
          </span>
          {e.is_you ? (
            <span className="rounded bg-brand/20 px-1.5 text-[10px] font-bold text-brand">
              YOU
            </span>
          ) : null}
          {e.category ? (
            <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10.5px] text-mut">
              {e.category}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-[11px] text-dim">
            <Timer size={11} /> day {e.days_elapsed}
          </span>
        </div>
        <div className="mt-1.5">
          <MilestoneBadges milestones={e.milestones} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-mut">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {e.metrics.views.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <MousePointerClick size={12} /> {e.metrics.clicks.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Rocket size={12} /> {e.metrics.conversions.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[12px] font-semibold text-ink">
          {e.business_stage_label}
        </div>
        {e.days_from_start != null ? (
          <div className="text-[11px] text-dim">
            in {e.days_from_start}d
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters / search / pagination (server-side).
  const [metric, setMetric] = useState<LeaderboardMetricSort>("speed");
  const [category, setCategory] = useState<string>("");
  const [milestone, setMilestone] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [qInput, setQInput] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cytapi.leaderboard({
        metric,
        category: category || undefined,
        milestone: milestone || undefined,
        q: q || undefined,
        page,
        per_page: 20,
      });
      setData(res);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't load the leaderboard. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [metric, category, milestone, q, page, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [metric, category, milestone, q]);

  const catalog = data?.catalog ?? [];
  const categories = data?.categories ?? [];
  const you = data?.you ?? null;

  const businessCatalog = useMemo(
    () => catalog.filter((c: MilestoneCatalogItem) => c.category === "business"),
    [catalog],
  );
  const socialCatalog = useMemo(
    () => catalog.filter((c: MilestoneCatalogItem) => c.category === "social"),
    [catalog],
  );

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qInput.trim());
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />

      <section className="mx-auto mt-10 max-w-[900px]">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-tight text-ink">
            <Trophy size={22} className="text-brand" /> The 29-day business race
          </h1>
          <p className="mt-1 text-[13.5px] text-mut">
            Opted-in businesses ranked by how FAST they hit real milestones —
            website live, first $1, first $1k, volume — and the social reach
            their agents earn. Only real, earned achievements appear.
          </p>
        </header>

        {/* Your position banner */}
        {you ? (
          <div className="mb-4 rounded-xl border border-brand/50 bg-brand/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-ink">
                Your best rank: #{you.rank} · {you.name}
              </span>
              <span className="text-[12px] text-mut">
                {you.business_stage_label}
                {you.days_from_start != null
                  ? ` in ${you.days_from_start}d`
                  : ""}
              </span>
            </div>
            <div className="mt-2">
              <MilestoneBadges milestones={you.milestones} />
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-line bg-panel2 px-4 py-3 text-[12.5px] text-mut">
            You&apos;re not on the board yet — open a topic&apos;s Battle Pass tab
            and hit <span className="font-semibold text-ink">Join the race</span>{" "}
            to opt in.
          </div>
        )}

        {/* Controls */}
        <div className="mb-4 space-y-3 rounded-xl border border-line bg-panel2 p-3">
          {/* Metric segmented control */}
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  metric === m.key
                    ? "border-brand/50 bg-brand/10 text-brand"
                    : "border-line bg-panel text-mut hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search by name / category */}
            <form onSubmit={submitSearch} className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dim"
              />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search businesses by name or category…"
                className="w-full rounded-lg border border-line bg-panel px-8 py-1.5 text-[12.5px] text-ink placeholder:text-dim focus:border-brand/50 focus:outline-none"
              />
            </form>

            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] text-ink focus:border-brand/50 focus:outline-none"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Milestone filter */}
            <select
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] text-ink focus:border-brand/50 focus:outline-none"
            >
              <option value="">Any milestone</option>
              {businessCatalog.length > 0 && (
                <optgroup label="Business">
                  {businessCatalog.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {socialCatalog.length > 0 && (
                <optgroup label="Social">
                  {socialCatalog.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Board */}
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-8 text-[13px] text-dim">
            <Loader2 size={14} className="animate-spin" /> Loading the race…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#4a1f1f] bg-[#1c0e0e] px-4 py-3 text-[12.5px] text-bad">
            {error}
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="rounded-xl border border-line bg-panel2 px-4 py-8 text-center text-[13px] text-dim">
            No businesses match — try clearing a filter. Only opted-in
            businesses with real, earned milestones appear here.
          </div>
        ) : (
          <>
            <ol className="space-y-2">
              {data.entries.map((e) => (
                <BoardRow key={e.id} e={e} />
              ))}
            </ol>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-[12.5px] text-mut">
              <span>
                {data.total} business{data.total === 1 ? "" : "es"} · page{" "}
                {data.page} / {data.pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-line bg-panel px-3 py-1 font-semibold text-ink disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-line bg-panel px-3 py-1 font-semibold text-ink disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
