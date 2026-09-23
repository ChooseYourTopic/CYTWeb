import type { Metadata } from "next";
import Link from "next/link";
import { Factory, GitCommitHorizontal, ArrowLeft, Rocket, Flag } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  loadRoadmap,
  type Enhancement,
  type QueueItem,
  type QueueState,
  type Roadmap,
  type StatusItem,
} from "@/lib/roadmap";

// PUBLIC internal status board. Read the roadmap JSON at REQUEST time so
// orchestrator edits to the box data file show with no redeploy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "ChooseYourTopic — build status",
  description: "Live Winslow orchestration status board for ChooseYourTopic.",
  robots: { index: false, follow: false },
};

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function SectionHeading({ eyebrow, title, count }: { eyebrow: string; title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>
        <h2 className="mt-0.5 text-[20px] font-bold tracking-[-0.3px] text-ink">{title}</h2>
      </div>
      {typeof count === "number" && (
        <span className="shrink-0 rounded-full border border-line bg-panel2 px-2.5 py-1 text-[12px] font-medium text-mut">
          {count} item{count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

const STATUS_COLUMNS: { key: keyof Roadmap["status"]; label: string; dot: string }[] = [
  { key: "live", label: "Live", dot: "bg-good" },
  { key: "inProgress", label: "In progress", dot: "bg-warn" },
  { key: "waiting", label: "Waiting", dot: "bg-dim" },
];

function StatusCard({ item, columnKey }: { item: StatusItem; columnKey: keyof Roadmap["status"] }) {
  return (
    <li className="rounded-xl border border-line bg-panel2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13.5px] font-semibold leading-snug text-ink">{item.title}</p>
        {item.ref && (
          <code className="shrink-0 rounded bg-bg px-1.5 py-0.5 text-[11px] font-medium text-brand">{item.ref}</code>
        )}
      </div>
      {item.detail && <p className="mt-1.5 text-[12.5px] leading-relaxed text-mut">{item.detail}</p>}
      {columnKey === "waiting" && item.waitsOn && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-mut">
          <span className="mt-px shrink-0 rounded bg-brand/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-brand">
            waits on
          </span>
          <span>{item.waitsOn}</span>
        </p>
      )}
    </li>
  );
}

const QUEUE_META: Record<QueueState, { label: string; badge: string; symbol: string }> = {
  done: { label: "Done", badge: "bg-good/15 text-good ring-good/25", symbol: "✓" },
  "in-progress": { label: "In progress", badge: "bg-warn/15 text-warn ring-warn/25", symbol: "◐" },
  queued: { label: "Queued", badge: "bg-panel2 text-mut ring-line", symbol: "○" },
};

function QueueRow({ item }: { item: QueueItem }) {
  const meta = QUEUE_META[item.state];
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3.5 py-2.5">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ring-1 ring-inset ${meta.badge}`}
        aria-hidden="true"
      >
        {meta.symbol}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink" title={item.title}>
        {item.title}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${meta.badge}`}
      >
        {meta.label}
      </span>
    </li>
  );
}

function EnhancementCard({ item }: { item: Enhancement }) {
  const isDecision = item.kind === "decision";
  return (
    <li className="rounded-xl border border-line bg-panel2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13.5px] font-semibold leading-snug text-ink">{item.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
            isDecision ? "bg-brand/15 text-brand ring-brand/25" : "bg-brand2/15 text-brand2 ring-brand2/25"
          }`}
        >
          {isDecision ? "Decision" : "Backlog"}
        </span>
      </div>
      {item.detail && <p className="mt-1.5 text-[12.5px] leading-relaxed text-mut">{item.detail}</p>}
    </li>
  );
}

export default async function PreviewStatusPage() {
  const roadmap = await loadRoadmap();

  const queueCounts = roadmap.queue.reduce(
    (acc, q) => {
      acc[q.state] += 1;
      return acc;
    },
    { done: 0, "in-progress": 0, queued: 0 } as Record<QueueState, number>
  );
  const queueTotal = roadmap.queue.length || 1;
  const donePct = Math.round((queueCounts.done / queueTotal) * 100);
  const progressPct = Math.round((queueCounts["in-progress"] / queueTotal) * 100);
  const reconcile = roadmap.reconcile;

  return (
    <main className="mx-auto max-w-[1080px] px-6 pb-24">
      <SiteHeader />

      {/* Header */}
      <header className="mt-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1 text-[12px] text-mut">
            <Factory size={13} className="text-brand" /> Winslow orchestration · build board
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.6px] text-ink sm:text-[32px]">
            Build <span className="cyt-gradient-text">status board</span>
          </h1>
          {roadmap.headline && <p className="mt-1 max-w-2xl text-[14px] text-mut">{roadmap.headline}</p>}
        </div>
        <div className="shrink-0 rounded-xl border border-line bg-panel px-4 py-3 text-[13px]">
          <div className="text-[11px] font-medium uppercase tracking-wide text-dim">Last updated</div>
          <div className="mt-0.5 font-semibold text-ink">{formatUpdated(roadmap.updatedAt)}</div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-[12px]">
            <Link href="/preview/releases" className="inline-flex items-center gap-1 font-medium text-brand hover:text-ink">
              <Rocket size={12} /> Build log
            </Link>
            <Link href="/roadmap" className="inline-flex items-center gap-1 font-medium text-mut hover:text-ink">
              <Flag size={12} /> Product roadmap
            </Link>
            <Link href="/preview" className="inline-flex items-center gap-1 font-medium text-mut hover:text-ink">
              <ArrowLeft size={12} /> The build
            </Link>
          </div>
        </div>
      </header>

      {roadmap.note && (
        <p className="mt-5 rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-[13px] leading-relaxed text-ink">
          {roadmap.note}
        </p>
      )}

      {/* Reconcile watermark — box HEAD → GitHub main → local, stamped by Winslow each pass. */}
      {reconcile && (reconcile.lastReconciled || reconcile.acked?.length || reconcile.sequence != null) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-dim">
          <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-dim">
            <GitCommitHorizontal size={13} /> Reconcile
          </span>
          {reconcile.lastReconciled && <span>last {formatUpdated(reconcile.lastReconciled)}</span>}
          {reconcile.sequence != null && <span>· pass #{reconcile.sequence}</span>}
          {reconcile.acked?.length ? (
            <span className="inline-flex flex-wrap items-center gap-1">
              · acked
              {reconcile.acked.map((sha) => (
                <code key={sha} className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px] text-brand">
                  {sha}
                </code>
              ))}
            </span>
          ) : null}
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-mut">
        <span className="font-semibold uppercase tracking-wide text-dim">Legend</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-good" /> Live / Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warn" /> In progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-dim" /> Waiting / Queued
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded bg-brand/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-brand">
            waits on
          </span>{" "}
          blocker / decision
        </span>
      </div>

      {/* Section 1 — Roadmap status */}
      <section className="mt-10">
        <SectionHeading eyebrow="Section 1" title="Roadmap status" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STATUS_COLUMNS.map((col) => {
            const items = roadmap.status[col.key] ?? [];
            return (
              <div key={col.key} className="rounded-2xl border border-line bg-panel p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-[13px] font-bold uppercase tracking-wide text-mut">{col.label}</h3>
                  </div>
                  <span className="text-[12px] font-semibold text-dim">{items.length}</span>
                </div>
                <ul className="space-y-2.5">
                  {items.length ? (
                    items.map((item, i) => <StatusCard key={i} item={item} columnKey={col.key} />)
                  ) : (
                    <li className="rounded-xl border border-dashed border-line p-3.5 text-center text-[13px] text-dim">
                      Nothing here
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2 — Feature / build queue */}
      <section className="mt-12">
        <SectionHeading eyebrow="Section 2" title="Feature / build queue" count={roadmap.queue.length} />

        <div className="mb-5 rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-ink">{donePct}% shipped</span>
            <span className="text-mut">
              {queueCounts.done} done · {queueCounts["in-progress"]} in progress · {queueCounts.queued} queued
            </span>
          </div>
          <div
            className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-panel2"
            role="img"
            aria-label={`${donePct}% done, ${progressPct}% in progress`}
          >
            <div className="h-full bg-good" style={{ width: `${donePct}%` }} />
            <div className="h-full bg-warn" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {roadmap.queue.map((item) => (
            <QueueRow key={item.key} item={item} />
          ))}
        </ul>
      </section>

      {/* Section 3 — Enhancements & decisions */}
      <section className="mt-12">
        <SectionHeading eyebrow="Section 3" title="Feature enhancements & open decisions" count={roadmap.enhancements.length} />
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.enhancements.map((item, i) => (
            <EnhancementCard key={i} item={item} />
          ))}
        </ul>
      </section>

      <footer className="mt-14 border-t border-line pt-5 text-center text-[12px] text-dim">
        ChooseYourTopic — a Kuykendall Empire product · Winslow status board reads live roadmap data
        {roadmap.source === "bundled-fallback" && " · showing bundled fallback (box file not yet present)"}
      </footer>
    </main>
  );
}
