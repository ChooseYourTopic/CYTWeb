"use client";

import { Webhook, KeyRound, Globe, Users, Link2 } from "lucide-react";

const ITEMS = [
  { Icon: Webhook, name: "Webhooks", desc: "Send project events to your own endpoints." },
  { Icon: KeyRound, name: "API access", desc: "Programmatic access to your project's data." },
  { Icon: Globe, name: "Connected domains", desc: "Point a custom domain at your project." },
  { Icon: Users, name: "Team access", desc: "Invite collaborators to work alongside the crew." },
  { Icon: Link2, name: "Partner links", desc: "Affiliate and partner referrals." },
];

/** Network tab — the project's outbound connections and reach. v1 catalog. */
export function NetworkPanel() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Network</h3>
        <p className="text-[13px] text-mut">
          How your project connects out — endpoints, access, and reach.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((i) => (
          <div
            key={i.name}
            className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel2 text-brand">
              <i.Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink">{i.name}</div>
              <p className="mt-0.5 text-[12.5px] text-mut">{i.desc}</p>
              <button
                type="button"
                className="mt-2 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut transition-colors hover:text-ink"
              >
                Set up
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-dim">
        Network setup is rolling out — these are the connection points coming next.
      </p>
    </div>
  );
}
