"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ListChecks, Flag, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { cytapi, type NextStep, type RoadmapEntry } from "@/lib/api";

/**
 * NEXT — the project's driver. The current NEXT STEP (the top of the roadmap queue)
 * always sits here; it's what perpetually triggers Winslow and it's never empty once
 * the project is activated. Beneath it, RECOMMENDED next steps: the carry-overs from
 * earlier activity, still open in the queue, that analysis says to prioritize next.
 * Live from the topic's derived next-step surface — it re-points itself the moment an
 * agent finishes and its entry ships.
 */

const STATUS_STYLE: Record<string, string> = {
  proposed: "border-line bg-panel2 text-mut",
  in_progress: "border-brand/40 bg-brand/10 text-brand",
  in_review: "border-[#4a3b1a] bg-[#1c1708] text-warn",
  shipped: "border-good/40 bg-good/10 text-good",
  archived: "border-line bg-panel2 text-dim",
};

function agentLabel(a: string | null): string {
  if (!a) return "";
  const special: Record<string, string> = {
    front_end_developer: "Front-end Developer",
    back_end_developer: "Back-end Developer",
    seo_specialist: "SEO Specialist",
    orchestrator: "Orchestrator (Winslow)",
    winslow_prime: "Winslow Prime",
  };
  return special[a] ?? a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        STATUS_STYLE[status] ?? STATUS_STYLE.proposed,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function NextStepsPanel({ topicId }: { topicId: string }) {
  const [data, setData] = useState<NextStep | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await cytapi.nextStep(topicId));
    } catch {
      /* fail-soft — keep the last good next-step */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = data?.current ?? null;
  const recommended = data?.recommended ?? [];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">NEXT</h3>
        <p className="text-[13px] text-mut">
          The one step driving the project forward, plus the carry-overs worth
          prioritizing. The crew keeps moving on its own — this is what&apos;s next.
        </p>
      </div>

      {/* THE next step — always present once activated. */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12px] uppercase tracking-wider text-dim">
          <Zap size={13} /> Your next step
        </div>
        {loading ? (
          <p className="text-[13px] text-mut">Loading…</p>
        ) : current ? (
          <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink">{current.title}</div>
                {current.description && (
                  <p className="mt-1 text-[12.5px] text-mut">{current.description}</p>
                )}
              </div>
              <StatusBadge status={current.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="rounded-md border border-line bg-panel2 px-2 py-0.5 text-mut">
                Priority {current.priority}
              </span>
              {current.agent_type && (
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-0.5 text-mut">
                  <ArrowRight size={11} /> {agentLabel(current.agent_type)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-panel2/40 px-3.5 py-4 text-center text-[12.5px] text-dim">
            No next step yet — hit Start now and Winslow will set one.
          </div>
        )}
      </div>

      {/* Recommended carry-overs — the rest of the open queue, priority order. */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12px] uppercase tracking-wider text-dim">
          <ListChecks size={13} /> Recommended next
        </div>
        {loading ? (
          <p className="text-[13px] text-mut">Loading…</p>
        ) : recommended.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-panel2/40 px-3.5 py-4 text-center text-[12.5px] text-dim">
            Nothing carried over — the queue is clear beyond your next step.
          </div>
        ) : (
          <div className="space-y-2">
            {recommended.map((e: RoadmapEntry) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-3.5 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-md border border-line bg-panel2 text-mut">
                    <Flag size={12} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-ink">{e.title}</div>
                    <div className="text-[11px] text-dim">
                      Priority {e.priority}
                      {e.agent_type ? ` · ${agentLabel(e.agent_type)}` : ""}
                    </div>
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
