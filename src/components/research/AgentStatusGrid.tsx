"use client";

import { useAgentStatus } from "@/hooks/useAgentStatus";
import { cn, label } from "@/lib/utils";
import type { AgentStatus } from "@/lib/api";

// The v1 crew (Orchestrator/CEO + focused core), with room for the rest.
const AGENT_ORDER = [
  "orchestrator",
  "business_planning",
  "competitor_research",
  "social_media",
  "email_outreach",
  "customer_support",
  "ads_management",
  "finance",
  "code_generation",
];

const AGENT_DESC: Record<string, string> = {
  orchestrator: "CEO · plans the day",
  business_planning: "strategy & KPIs",
  competitor_research: "market & rivals",
  social_media: "content drafts",
  email_outreach: "prospecting",
  customer_support: "inbox",
  ads_management: "campaigns",
  finance: "revenue & spend",
  code_generation: "builds the site",
};

function statusClass(s: AgentStatus | undefined): string {
  if (!s || !s.last_run_status) return "bg-dim";
  if (s.last_run_status === "running" || s.last_run_status === "in_progress")
    return "bg-warn animate-pulse2 shadow-[0_0_0_3px_#f6c45322]";
  if (s.last_run_status === "completed" || s.last_run_status === "success")
    return "bg-good";
  if (s.last_run_status === "failed" || s.last_run_status === "error")
    return "bg-bad";
  return "bg-dim";
}

export function AgentStatusGrid() {
  const { statuses, loading } = useAgentStatus();
  const byType = new Map(statuses.map((s) => [s.agent_type, s]));

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {AGENT_ORDER.map((id) => {
        const s = byType.get(id);
        return (
          <div
            key={id}
            className="flex items-center gap-2.5 rounded-[9px] px-2 py-2 text-[13px]"
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                loading ? "bg-dim" : statusClass(s),
              )}
            />
            <span className="flex-1">{label(id)}</span>
            <span className="text-[12px] text-dim">
              {AGENT_DESC[id] ?? ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
