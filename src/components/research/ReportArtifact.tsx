"use client";

import { useState } from "react";
import { PanelShell } from "@/components/research/PanelShell";
import { Dialog } from "@/components/research/ProgressiveCard";
import { useSectionData } from "@/hooks/useSectionData";
import { cytapi, type DailyReport } from "@/lib/api";

/**
 * Report tab — browsable daily reports (morning plan + evening summary)
 * rendered as a readable/shareable artifact.
 */
export function ReportArtifact() {
  const { data, loading } = useSectionData<DailyReport[]>("report", () =>
    cytapi.reports(20),
  );
  const reports = data ?? [];
  const [open, setOpen] = useState<DailyReport | null>(null);

  return (
    <>
      <PanelShell
        title="Daily reports"
        subtitle="Morning plan and evening summary — your investigation archive."
        loading={loading}
        isEmpty={reports.length === 0}
        emptyLabel="The first daily report lands after today's cycle."
      >
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpen(r)}
            className="animate-rise block w-full rounded-[11px] border border-line bg-panel2 p-4 text-left hover:border-[#31384c]"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-ink">{r.title}</div>
              <div className="text-[12px] text-dim">{r.date}</div>
            </div>
            {r.evening_summary && (
              <p className="mt-1 line-clamp-2 text-[13px] text-mut">
                {r.evening_summary}
              </p>
            )}
          </button>
        ))}
      </PanelShell>

      {open && (
        <Dialog title={open.title} onClose={() => setOpen(null)}>
          <div className="text-[12px] text-dim">{open.date}</div>
          {open.morning_plan && (
            <section className="mt-4">
              <h4 className="text-[12px] uppercase tracking-wide text-mut">
                Morning plan
              </h4>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/90">
                {open.morning_plan}
              </p>
            </section>
          )}
          {open.evening_summary && (
            <section className="mt-4">
              <h4 className="text-[12px] uppercase tracking-wide text-mut">
                Evening summary
              </h4>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/90">
                {open.evening_summary}
              </p>
            </section>
          )}
          {open.body && (
            <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/90">
              {open.body}
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
