"use client";

import { useAgentStatus } from "@/hooks/useAgentStatus";
import { label } from "@/lib/utils";
import type { AgentStatus } from "@/lib/api";

type Light = "green" | "orange" | "yellow" | "red" | "gray";

const COLORS: Record<Light, string> = {
  green: "#22c55e",
  orange: "#f97316",
  yellow: "#eab308",
  red: "#ef4444",
  gray: "#64748b",
};

const LABELS: Record<Light, string> = {
  green: "Working",
  orange: "Busy",
  yellow: "Queued",
  red: "Error",
  gray: "Idle",
};

/**
 * Map an agent's live status to a traffic light:
 *   green  = running right now
 *   orange = actively working through a queue today
 *   yellow = has queued work, not started
 *   red    = last run failed
 *   gray   = idle
 */
function lightFor(a: AgentStatus): Light {
  const st = (a.last_run_status ?? "").toLowerCase();
  const pending = a.tasks_pending ?? 0;
  const today = a.tasks_today ?? 0;

  if (st === "failed" || st === "error") return "red";
  if (st === "running" || st === "in_progress") return "green";
  if (pending > 0 && today > 0) return "orange";
  if (pending > 0) return "yellow";
  return "gray";
}

function Dot({ light }: { light: Light }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        light === "green" ? "animate-pulse" : ""
      }`}
      style={{ backgroundColor: COLORS[light] }}
    />
  );
}

/**
 * Status tab — a live monitor: the orchestrator light (green while it's actually
 * orchestrating) and a traffic light per agent showing what it's doing.
 */
export function StatusPanel({ topicId }: { topicId: string }) {
  const { statuses, loading } = useAgentStatus(topicId, 15000);

  const orchestrator = statuses.find((s) => s.agent_type === "orchestrator");
  const agents = statuses.filter((s) => s.agent_type !== "orchestrator");
  const orchLight = orchestrator ? lightFor(orchestrator) : "gray";

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Status</h3>
        <p className="text-[13px] text-mut">
          Live indicators for the orchestrator and every agent on the job.
        </p>
      </div>

      {/* Orchestrator light */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel2 p-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            orchLight === "green" ? "animate-pulse" : ""
          }`}
          style={{ backgroundColor: `${COLORS[orchLight]}22` }}
        >
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: COLORS[orchLight] }}
          />
        </span>
        <div>
          <div className="text-[14px] font-bold text-ink">Orchestrator</div>
          <div className="text-[12.5px] text-mut">
            {orchLight === "green"
              ? "Orchestrating — planning and delegating right now."
              : orchLight === "red"
                ? "Last cycle hit an error."
                : orchLight === "orange" || orchLight === "yellow"
                  ? "Work is queued for the next cycle."
                  : "Idle — waiting for the next cycle."}
          </div>
        </div>
      </div>

      {/* Agent lights */}
      <div>
        <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
          Agents
        </div>
        {loading && agents.length === 0 ? (
          <p className="text-[13px] text-dim">Reading agent status…</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.map((a) => {
              const light = lightFor(a);
              return (
                <div
                  key={a.agent_type}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-panel p-3"
                >
                  <Dot light={light} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-ink">
                      {label(a.agent_type)}
                    </div>
                    <div className="text-[12px] text-mut">
                      {LABELS[light]}
                      {(a.tasks_pending ?? 0) > 0
                        ? ` · ${a.tasks_pending} queued`
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-mut">
        {(["green", "orange", "yellow", "red", "gray"] as Light[]).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <Dot light={l} /> {LABELS[l]}
          </span>
        ))}
      </div>
    </div>
  );
}
