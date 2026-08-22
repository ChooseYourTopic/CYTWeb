"use client";

import { useState } from "react";
import {
  GitBranch,
  ArrowRight,
  Check,
  ListChecks,
  CircleHelpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NEXT — the owner's on-the-loop surface: what's queued to happen next and any
 * decision-tree items waiting on YOU. The system keeps paving forward on its own;
 * this tab is where it surfaces the few forks that genuinely need your call, plus
 * the next steps/actions in flight. Interface pass — the decision + next-action
 * feed wires to the orchestrator's pending-decision + roadmap-next signals next.
 */

type Decision = {
  id: string;
  question: string;
  detail: string;
  options: string[];
};

type NextAction = {
  id: string;
  label: string;
  by: string;
};

// Illustrative seed content until the live pending-decision / roadmap-next feed
// is wired — shows the shape of what lands here.
const SAMPLE_DECISIONS: Decision[] = [];

const SAMPLE_NEXT: NextAction[] = [];

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel2/40 px-3.5 py-4 text-center text-[12.5px] text-dim">
      {text}
    </div>
  );
}

export function NextStepsPanel({ topicId }: { topicId: string }) {
  void topicId; // reserved for the live pending-decision / roadmap-next fetch
  const [decisions] = useState<Decision[]>(SAMPLE_DECISIONS);
  const [next] = useState<NextAction[]>(SAMPLE_NEXT);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">NEXT</h3>
        <p className="text-[13px] text-mut">
          What&apos;s coming next, and anything waiting on your call. The crew keeps
          moving on its own — you steer the few forks that need you.
        </p>
      </div>

      {/* Decisions waiting for the owner — the on-the-loop forks. */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12px] uppercase tracking-wider text-dim">
          <GitBranch size={13} /> Decisions waiting for you
        </div>
        {decisions.length === 0 ? (
          <EmptyRow text="Nothing needs your decision right now — the crew is handling it." />
        ) : (
          <div className="space-y-2.5">
            {decisions.map((d) => (
              <div key={d.id} className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
                <div className="flex items-start gap-2">
                  <CircleHelpIcon size={15} className="mt-0.5 flex-none text-brand" />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-ink">{d.question}</div>
                    <p className="mt-0.5 text-[12.5px] text-mut">{d.detail}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={cn(
                        "rounded-lg border border-line bg-panel2 px-3 py-1.5 text-[12.5px] text-mut transition-colors hover:text-ink",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next steps / actions in flight. */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12px] uppercase tracking-wider text-dim">
          <ListChecks size={13} /> Next steps &amp; actions
        </div>
        {next.length === 0 ? (
          <EmptyRow text="No queued next actions yet — activate the crew and they'll line up here." />
        ) : (
          <div className="space-y-2">
            {next.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-3.5 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-md border border-line bg-panel2 text-mut">
                    <ArrowRight size={13} />
                  </span>
                  <span className="text-[13px] text-ink">{n.label}</span>
                </div>
                <span className="flex-none text-[11.5px] text-dim">{n.by}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-panel2/50 p-3 text-[11.5px] text-dim">
        <Check size={13} className="mt-0.5 flex-none" />
        <span>
          This feed wires to the orchestrator&apos;s pending-decision and roadmap-next
          signals — decisions land here the moment the crew hits a fork that needs you.
        </span>
      </div>
    </div>
  );
}
