"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Rocket } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  type RoadmapEntry,
  type RoadmapLedger,
  type RoadmapStatus,
} from "@/lib/api";

const STATUS_META: Record<RoadmapStatus, { label: string; cls: string }> = {
  proposed: { label: "Planned", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In progress", cls: "bg-blue-100 text-blue-700" },
  in_review: { label: "In review", cls: "bg-amber-100 text-amber-700" },
  shipped: { label: "Shipped", cls: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", cls: "bg-slate-100 text-slate-400" },
};

function StatusPill({ status }: { status: RoadmapStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.proposed;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function QueueRow({ entry }: { entry: RoadmapEntry }) {
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
    </div>
  );
}

export default function PlatformRoadmapPage() {
  const [ledger, setLedger] = useState<RoadmapLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setLedger(await cytapi.platformRoadmap());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = ledger?.counts;

  return (
    <main className="mx-auto max-w-[860px] px-6 pb-16">
      <SiteHeader />

      <header className="mb-5 mt-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-[-0.4px]">
            <Flag size={20} className="text-brand" /> Product roadmap
          </h1>
          <Link
            href="/releases"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mut transition-colors hover:text-ink"
          >
            <Rocket size={14} /> Release notes
          </Link>
        </div>
        <p className="mt-1 text-[14px] text-mut">
          What we&apos;re building for ChooseYourTopic — the work queue in priority
          order, and what&apos;s already shipped.
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
              In progress now
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
              <QueueRow key={e.id} entry={e} />
            ))}
          </div>
        ) : (
          <p className="p-4 text-[13px] text-mut">
            The queue is empty right now.
          </p>
        )}
      </Card>

      {ledger && ledger.shipped.length > 0 && (
        <Card>
          <CardHeader>
            <span className="inline-flex items-center gap-1.5">
              <Rocket size={13} /> Shipped · release notes
            </span>
          </CardHeader>
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
                  <p className="mt-0.5 text-[13px] text-mut">{e.release_note}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
