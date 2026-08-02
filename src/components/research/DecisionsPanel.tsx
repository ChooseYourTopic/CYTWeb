"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { PanelShell } from "@/components/research/PanelShell";
import { useSectionData } from "@/hooks/useSectionData";
import { client, cytapi, type Task } from "@/lib/api";
import { label } from "@/lib/utils";

type Decision = Record<number, "approved" | "rejected">;

/**
 * Decisions tab — the approve/reject queue over pending tasks, with optimistic
 * updates (reflect the choice immediately, reconcile with the server).
 */
export function DecisionsPanel() {
  const { data, loading } = useSectionData<Task[]>("decisions", () =>
    cytapi.tasks(50),
  );
  const [decided, setDecided] = useState<Decision>({});

  const tasks = (data ?? []).filter(
    (t) => t.status === "pending" || t.status === "awaiting_approval",
  );

  async function decide(id: number, choice: "approved" | "rejected") {
    setDecided((d) => ({ ...d, [id]: choice })); // optimistic
    try {
      await client.put<unknown>(`/tasks/${id}`, { status: choice });
    } catch {
      // Reconcile: roll back on failure.
      setDecided((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <PanelShell
      title="Your call needed"
      subtitle="Approve or steer the plan — the team proceeds on your go."
      loading={loading}
      isEmpty={tasks.length === 0}
      emptyLabel="No decisions pending — the team is heads-down."
    >
      {tasks.map((t) => {
        const state = decided[t.id];
        return (
          <div
            key={t.id}
            className="animate-rise rounded-[11px] border border-line bg-panel2 p-4"
          >
            <div className="font-semibold text-ink">{t.title}</div>
            <div className="mt-1 text-[12px] text-mut">
              {label(t.agent_type)} · priority {t.priority}
            </div>
            {state ? (
              <div
                className={
                  "mt-3 text-[13px] font-medium " +
                  (state === "approved" ? "text-good" : "text-bad")
                }
              >
                {state === "approved" ? "Approved ✓" : "Rejected"}
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => decide(t.id, "approved")}
                  className="flex items-center gap-1.5 rounded-lg border border-[#1f5e42] bg-good/10 px-3 py-1.5 text-[13px] font-medium text-good"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => decide(t.id, "rejected")}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-mut hover:text-ink"
                >
                  <X size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </PanelShell>
  );
}
