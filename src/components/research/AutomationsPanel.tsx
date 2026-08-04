"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

const AUTOMATIONS = [
  { name: "Auto-publish approved drafts", cat: "Marketing", desc: "Publish social posts the moment you approve them." },
  { name: "Daily performance digest", cat: "Reporting", desc: "Email a summary of the day's work each evening." },
  { name: "Low-budget alert", cat: "Finance", desc: "Ping you when a project nears its spend cap." },
  { name: "Auto-answer common questions", cat: "Support", desc: "Let support draft replies to FAQs automatically." },
  { name: "Weekly competitor recheck", cat: "Research", desc: "Refresh the competitor research every week." },
];

/** Automations tab — rules the agents can run without you. v1: staged toggles. */
export function AutomationsPanel() {
  const [on, setOn] = useState<Set<string>>(new Set());
  const toggle = (n: string) =>
    setOn((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Automations</h3>
        <p className="text-[13px] text-mut">
          Rules your agents run without you. Toggle what you want on.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {AUTOMATIONS.map((a) => {
          const active = on.has(a.name);
          return (
            <div
              key={a.name}
              className="rounded-2xl border border-line bg-panel p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <Zap size={15} className="text-brand" /> {a.name}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(a.name)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                      : "border-line text-mut hover:text-ink"
                  }`}
                >
                  {active ? "On" : "Off"}
                </button>
              </div>
              <span className="mt-1.5 inline-block rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                {a.cat}
              </span>
              <p className="mt-1.5 text-[12.5px] text-mut">{a.desc}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-dim">
        Automations are staged — wiring each to run live is on the way.
      </p>
    </div>
  );
}
