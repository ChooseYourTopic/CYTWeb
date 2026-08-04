"use client";

import { useState } from "react";
import { Check, Plug } from "lucide-react";

type Integration = {
  name: string;
  category: string;
  desc: string;
  color: string;
  initial: string;
};

const INTEGRATIONS: Integration[] = [
  { name: "XTKRecall MCP", category: "Knowledge", desc: "Connect your XTKRecall vault over MCP — bring your agents, skills, and context.", color: "#7C3AED", initial: "X" },
  { name: "Twilio", category: "Communications", desc: "SMS, voice, and phone verification.", color: "#F22F46", initial: "T" },
  { name: "Supabase", category: "Data & Backend", desc: "Postgres database, auth, and storage.", color: "#3ECF8E", initial: "S" },
  { name: "DigitalOcean", category: "Infrastructure", desc: "Deploy and host your app and services.", color: "#0080FF", initial: "D" },
  { name: "Stripe", category: "Payments", desc: "Accept payments and manage subscriptions.", color: "#635BFF", initial: "S" },
  { name: "SendGrid", category: "Communications", desc: "Transactional and marketing email.", color: "#1A82E2", initial: "S" },
  { name: "GitHub", category: "Development", desc: "Source control + CI for the build agent.", color: "#8B949E", initial: "G" },
  { name: "X (Twitter)", category: "Marketing", desc: "Publish the social posts your agents draft.", color: "#1DA1F2", initial: "X" },
  { name: "Google Ads", category: "Marketing", desc: "Run and manage ad campaigns.", color: "#FBBC05", initial: "G" },
  { name: "Slack", category: "Notifications", desc: "Get project updates where your team works.", color: "#4A154B", initial: "S" },
];

/**
 * Integrations tab — a catalog of services a project can connect (Twilio,
 * Supabase, DigitalOcean, …). v1 flags intent; per-service credential/connection
 * setup is the next layer.
 */
export function IntegrationsPanel() {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  function connect(name: string) {
    setRequested((prev) => new Set(prev).add(name));
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Integrations</h3>
        <p className="text-[13px] text-mut">
          Connect the services your project uses. Setup for each is rolling out.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => {
          const on = requested.has(i.name);
          return (
            <div
              key={i.name}
              className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold text-white"
                style={{ backgroundColor: i.color }}
              >
                {i.initial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{i.name}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                    {i.category}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-mut">{i.desc}</p>
                <button
                  type="button"
                  onClick={() => connect(i.name)}
                  disabled={on}
                  className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    on
                      ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                      : "border-line text-mut hover:text-ink"
                  }`}
                >
                  {on ? (
                    <>
                      <Check size={12} /> Requested
                    </>
                  ) : (
                    <>
                      <Plug size={12} /> Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[12px] text-dim">
        Requesting an integration flags it for your project — credential setup for
        each service is on the way.
      </p>
    </div>
  );
}
