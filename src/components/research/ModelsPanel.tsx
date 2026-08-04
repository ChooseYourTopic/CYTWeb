"use client";

import { useState } from "react";
import { Check, Plug, Sparkles } from "lucide-react";

type Model = {
  name: string;
  category: string;
  desc: string;
  color: string;
  initial: string;
  active?: boolean;
};

const MODELS: Model[] = [
  { name: "Anthropic Claude", category: "Active", desc: "Opus, Sonnet & Haiku — powering your agents today.", color: "#D97757", initial: "A", active: true },
  { name: "OpenAI GPT", category: "LLM", desc: "GPT-5 and the GPT family.", color: "#10A37F", initial: "O" },
  { name: "Google Gemini", category: "LLM", desc: "Gemini Pro & Flash.", color: "#4285F4", initial: "G" },
  { name: "Meta Llama", category: "Open weight", desc: "Open-weight Llama models.", color: "#0668E1", initial: "L" },
  { name: "Mistral", category: "Open weight", desc: "Mistral & Mixtral models.", color: "#FF7000", initial: "M" },
  { name: "xAI Grok", category: "LLM", desc: "Grok models from xAI.", color: "#111827", initial: "X" },
  { name: "DeepSeek", category: "Open weight", desc: "DeepSeek reasoning models.", color: "#4D6BFE", initial: "D" },
  { name: "Cohere", category: "LLM", desc: "Command models for enterprise.", color: "#39594D", initial: "C" },
];

/**
 * Models tab — connect the AI models that power a project's agents. Claude runs
 * the agents today; the rest are a catalog for v1 (per-model routing/credentials
 * are the next layer).
 */
export function ModelsPanel() {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  function connect(name: string) {
    setRequested((prev) => new Set(prev).add(name));
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">AI models</h3>
        <p className="text-[13px] text-mut">
          Connect the models that power your agents. Claude runs them today — more
          are rolling out.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODELS.map((m) => {
          const on = requested.has(m.name);
          return (
            <div
              key={m.name}
              className={`flex items-start gap-3 rounded-2xl border bg-panel p-4 ${
                m.active ? "border-[#1f3d2e]" : "border-line"
              }`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.initial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{m.name}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-wide ${
                      m.active
                        ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                        : "border-line text-dim"
                    }`}
                  >
                    {m.category}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-mut">{m.desc}</p>
                {m.active ? (
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#1f3d2e] bg-[#0e1c16] px-2.5 py-1.5 text-[12px] font-semibold text-good">
                    <Sparkles size={12} /> Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(m.name)}
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
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[12px] text-dim">
        Requesting a model flags it for your project — connection and per-agent
        routing are on the way.
      </p>
    </div>
  );
}
