"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Rocket, Map } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi, type RoadmapEntry, type RoadmapLedger } from "@/lib/api";

/** Format a shipped date like "Aug 20, 2026" (falls back to nothing). */
function shippedOn(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function ReleaseRow({ entry }: { entry: RoadmapEntry }) {
  return (
    <div className="border-b border-line/60 px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">
            {entry.title}
          </div>
          {entry.release_note && (
            <p className="mt-1 text-[13.5px] leading-relaxed text-mut">
              {entry.release_note}
            </p>
          )}
        </div>
        {shippedOn(entry.shipped_at) && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {shippedOn(entry.shipped_at)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TopicReleasesPage({
  params,
}: {
  params: { id: string };
}) {
  const [ledger, setLedger] = useState<RoadmapLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const shipped = ledger?.shipped ?? [];

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
            <Rocket size={20} className="text-brand" /> Release notes
          </h1>
          <Link
            href={`/topic/${params.id}/roadmap`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mut transition-colors hover:text-ink"
          >
            <Map size={14} /> Roadmap
          </Link>
        </div>
        <p className="mt-1 text-[14px] text-mut">
          Everything the team has shipped, newest first — promoted up from the
          roadmap as each item landed.
        </p>
      </header>

      <Card>
        <CardHeader>Shipped</CardHeader>
        {loading ? (
          <p className="p-4 text-[13px] text-mut">Loading release notes…</p>
        ) : error ? (
          <p className="p-4 text-[13px] text-mut">
            Couldn&apos;t load release notes. Try again shortly.
          </p>
        ) : shipped.length > 0 ? (
          <div>
            {shipped.map((e) => (
              <ReleaseRow key={e.id} entry={e} />
            ))}
          </div>
        ) : (
          <p className="p-4 text-[13px] text-mut">
            Nothing shipped yet. As the team lands roadmap items, their release
            notes appear here.
          </p>
        )}
      </Card>
    </main>
  );
}
