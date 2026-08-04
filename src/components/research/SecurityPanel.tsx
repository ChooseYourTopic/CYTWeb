"use client";

import {
  ShieldCheck,
  KeyRound,
  MonitorSmartphone,
  Lock,
  ScrollText,
} from "lucide-react";

const ITEMS = [
  {
    Icon: ShieldCheck,
    name: "Sandbox mode",
    desc: "External actions — posts, emails, ads, charges — are held until you go live.",
    status: "On",
    good: true,
  },
  {
    Icon: KeyRound,
    name: "AI credentials",
    desc: "Your connected API key powers your agents and is stored encrypted.",
    status: "Manage",
  },
  {
    Icon: MonitorSmartphone,
    name: "Access & sessions",
    desc: "Devices currently signed into your account.",
    status: "Review",
  },
  {
    Icon: Lock,
    name: "Data & privacy",
    desc: "How your project's data is stored and used.",
    status: "View",
  },
  {
    Icon: ScrollText,
    name: "Audit log",
    desc: "Every action your agents and you have taken.",
    status: "View",
  },
];

/** Security tab — protection, access, and audit for the project. v1 catalog. */
export function SecurityPanel() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Security</h3>
        <p className="text-[13px] text-mut">
          What protects your project, your keys, and your data.
        </p>
      </div>
      <div className="space-y-2.5">
        {ITEMS.map((i) => (
          <div
            key={i.name}
            className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel2 text-brand">
              <i.Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink">{i.name}</div>
              <p className="mt-0.5 text-[12.5px] text-mut">{i.desc}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                i.good
                  ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                  : "border-line text-mut"
              }`}
            >
              {i.status}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-dim">
        These controls are surfacing here — full management is on the way.
      </p>
    </div>
  );
}
