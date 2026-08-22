"use client";

import { useEffect, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { cytapi } from "@/lib/api";

// Winslow's first-pass farm-out: each tab's context goes to a sensible default
// agent, so a dropped note lands already in someone's queue (reassignable in the
// roadmap's by-agent drill-down). null → left unassigned in the backlog.
const AREA_AGENT: Record<string, string> = {
  Team: "orchestrator",
  Status: "orchestrator",
  Support: "customer_support",
  Invoicing: "finance",
  Report: "research_analyst",
};
const AGENT_LABEL: Record<string, string> = {
  orchestrator: "Winslow",
  customer_support: "Support",
  finance: "Finance",
  research_analyst: "Research",
};

/**
 * ContextDropInput — the reusable intake box. Drop it on any display tab that has
 * no text field of its own so a user can TYPE or SPEAK context from that tab and it
 * lands on the roadmap as a new entry (the intake loop → Winslow). Mirrors the
 * "Add a next step" box in NextStepsPanel: a rounded-2xl panel card with a textarea,
 * the bright-orange mic, and a gradient submit. Fail-soft — a dropped POST never
 * breaks the tab it lives on.
 */
export function ContextDropInput({
  topicId,
  area,
  placeholder,
}: {
  /** The topic this context lands under. */
  topicId: string;
  /** Human label for the tab (e.g. "Team", "Status") — badges the entry + label. */
  area: string;
  /** Optional textarea placeholder; a sensible default is derived from the area. */
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [routedTo, setRoutedTo] = useState<string | null>(null);

  // Auto-clear the confirmation after a few seconds.
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 5000);
    return () => clearTimeout(t);
  }, [sent]);

  // Type or SPEAK context — it drops onto the roadmap as a new entry, tagged with
  // the tab it came from, and Winslow picks it up.
  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const entry = await cytapi.placeRoadmapEntry(topicId, {
        title: text,
        description: `From the ${area} tab`,
      });
      // Farm it out to this area's default agent so it lands in a queue, not the void.
      const agent = AREA_AGENT[area] ?? null;
      if (agent && entry?.id != null) {
        try {
          await cytapi.assignRoadmapEntry(topicId, entry.id, agent);
        } catch {
          /* leave it unassigned in the backlog if the assign doesn't land */
        }
      }
      setRoutedTo(agent ? (AGENT_LABEL[agent] ?? agent) : null);
      setDraft("");
      setSent(true);
    } catch {
      /* fail-soft — the tab keeps working even if the drop doesn't land */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
        Add context · {area}
      </div>
      <div className="flex items-start gap-2">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (sent) setSent(false);
          }}
          rows={2}
          placeholder={
            placeholder ??
            `Add context for the ${area.toLowerCase()} work — type it, or tap the mic and say it…`
          }
          className="min-h-[52px] w-full resize-y rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:outline-none"
        />
        <VoiceInputButton
          onTranscript={(t) => {
            setDraft((p) => (p ? `${p} ${t}` : t));
            if (sent) setSent(false);
          }}
          title={`Tap to talk — dictate ${area.toLowerCase()} context`}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        {sent ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-good">
            <CheckCircle2 size={13} />
            {routedTo
              ? `On the roadmap — farmed to ${routedTo}.`
              : "Queued for Winslow — it'll land on the roadmap."}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || sending}
          className="cyt-gradient-bg inline-flex flex-none items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold text-bg transition-opacity disabled:opacity-50"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Send to Winslow
        </button>
      </div>
    </div>
  );
}
