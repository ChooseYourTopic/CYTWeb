"use client";

import { Lock } from "lucide-react";
import { useResearchStore } from "@/store/useResearchStore";

/**
 * The E6 gate affordance: shown wherever a "run an agent" control is disabled
 * because no model is connected. Routes the user to the Models tab (where they
 * register an API key, connect an OAuth account, or add the XTKRecall MCP) using
 * the same store switch the section tabs use.
 *
 * - default: a full inline banner with a CTA button.
 * - compact: a tiny inline link, for tight controls (next-step cards, run-now).
 */
export function ConnectModelPrompt({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const setActive = useResearchStore((s) => s.setActiveSection);
  const goToModels = () => setActive("models");

  if (compact) {
    return (
      <button
        type="button"
        onClick={goToModels}
        className={`inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand transition-colors hover:underline ${className}`}
      >
        <Lock size={11} className="shrink-0" />
        Connect a model to activate your agents
      </button>
    );
  }

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-[11px] border border-[#3a3320] bg-[#1a1608] px-3.5 py-2.5 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Lock size={16} className="mt-0.5 shrink-0 text-warn" />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-warn">
            Connect a model to activate your agents
          </div>
          <div className="mt-0.5 text-[12.5px] text-mut">
            Add an API key, connect an account, or add the XTKRecall MCP before
            your agents can run.
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={goToModels}
        className="cyt-gradient-bg shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold text-bg"
      >
        Connect a model
      </button>
    </div>
  );
}
