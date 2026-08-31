"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { CONSUMERS, STAGE_LABEL, type ConsumerStage } from "@/lib/integrations-catalog";

// Searchable directory of the Empire platforms that consume ChooseYourTopic's data over the
// Empire Integration Bridge. Type to filter live across name, blurb and tags. Each tile links to
// its View/Setup how-to, which issues a scoped read-only bridge key against CYT.

const STAGE_STYLE: Record<ConsumerStage, string> = {
  live: "border-[#1f3d2e] bg-[#0e1c16] text-good",
  available: "border-line bg-panel2 text-mut",
};

export function IntegrationsSearch() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    const terms = query.split(/\s+/).filter(Boolean);
    return CONSUMERS.filter((c) => {
      if (!terms.length) return true;
      const hay = `${c.name} ${c.blurb} ${c.tags.join(" ")}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [query]);

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-[15px] font-semibold text-ink">Find an Empire integration</h2>
      <p className="mt-0.5 text-[13px] text-mut">
        These Empire platforms can pull your topics and customers one-way (read-only) over the
        Empire Integration Bridge. Open one to issue a scoped key.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2">
        <Search size={15} className="shrink-0 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. QuickerBiz, CRM, collectibles…"
          aria-label="Search Empire integrations"
          className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-dim"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="shrink-0 rounded-md px-2 py-0.5 text-[12px] text-dim transition-colors hover:text-ink"
            aria-label="Clear"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 text-[11.5px] text-dim">
        {results.length} {results.length === 1 ? "integration" : "integrations"}
        {query ? ` for “${q.trim()}”` : ""}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((c) => (
          <Link
            key={c.slug}
            href={`/integrations/${c.slug}`}
            className="group block rounded-xl border border-line bg-panel2 p-4 transition-colors hover:border-brand"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[14px] font-bold text-ink">{c.name}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STAGE_STYLE[c.stage]}`}
              >
                {STAGE_LABEL[c.stage]}
              </span>
            </div>
            <div className="mt-1">
              <span className="rounded-full border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brand">
                Data access
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-mut">{c.blurb}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand">
              View &amp; set up{" "}
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      {results.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-line p-6 text-center">
          <p className="text-[13px] text-mut">No Empire integrations match “{q.trim()}”.</p>
        </div>
      )}
    </div>
  );
}
