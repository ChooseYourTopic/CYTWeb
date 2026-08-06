"use client";

import { useState } from "react";
import { Mic, MicOff, Send, Loader2, CheckCircle2, Keyboard } from "lucide-react";
import { cytapi, type CueResult } from "@/lib/api";
import { AGENT_DISPLAY_NAMES } from "@/lib/utils";
import { useSpeechInput } from "@/hooks/useSpeechInput";

/** "social_media" -> "Social Media" (orchestrator -> "Winslow"). */
function prettyAgent(name: string): string {
  if (AGENT_DISPLAY_NAMES[name]) return AGENT_DISPLAY_NAMES[name];
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Push-to-talk cue: the owner speaks (or types) a direction for the project. Live
 * speech→text runs in the browser (Web Speech API) into an EDITABLE textarea, with
 * a typed fallback where the API is unavailable. "Send to Winslow" hands the text
 * to the orchestrator, who triages it and routes it to the specialist that should
 * own it. Occupies the former "what the team decided" slot in the living report.
 */
export function CueWinslow({ topicId }: { topicId?: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { supported, listening, interim, error: micError, toggle, stop } =
    useSpeechInput({
      // Each finalised phrase is appended to whatever is already in the field, so
      // dictation and typing compose naturally.
      onFinal: (chunk) =>
        setText((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk)),
    });

  async function send() {
    const body = text.trim();
    if (!topicId || !body || sending) return;
    stop();
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const r = await cytapi.cueWinslow(topicId, body);
      setResult(r);
      setText("");
    } catch {
      setError("Couldn't send that to Winslow — please try again.");
    } finally {
      setSending(false);
    }
  }

  // What shows in the textarea: the committed text plus any live interim words.
  const shownText = listening && interim ? `${text ? `${text} ` : ""}${interim}` : text;

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-mut">
        Tell Winslow what you want done — tap the mic and talk, or type it. He&apos;ll
        decide which agent should own it and drop it into their queue.
      </p>

      <div className="rounded-xl border border-line bg-panel2 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            {supported ? (
              <Mic size={14} className="text-brand" />
            ) : (
              <Keyboard size={14} className="text-brand" />
            )}
            Cue Winslow
          </span>
          {supported ? (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={listening}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                listening
                  ? "border-[#3d1f1f] bg-[#1c0e0e] text-bad"
                  : "border-[#1f3d2e] bg-[#0e1c16] text-good hover:brightness-125"
              }`}
            >
              {listening ? (
                <>
                  <MicOff size={13} /> Stop
                </>
              ) : (
                <>
                  <Mic size={13} /> Record
                </>
              )}
            </button>
          ) : null}
        </div>

        {listening && (
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-bad">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-bad" />
            Listening… speak now.
          </div>
        )}

        <textarea
          value={shownText}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={
            supported
              ? "Tap Record and talk, or type your cue here…"
              : "Type your cue here…"
          }
          className="cyt-input w-full resize-y text-[13px]"
        />

        {!supported && (
          <p className="mt-1.5 text-[11.5px] text-dim">
            Voice input isn&apos;t available in this browser — type your cue and
            it works just the same. (Live dictation needs Chrome or Edge.)
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11.5px] text-dim">
            {micError === "not-allowed"
              ? "Microphone blocked — allow access or type instead."
              : ""}
          </span>
          <button
            type="button"
            onClick={send}
            disabled={!topicId || !text.trim() || sending}
            className="cyt-gradient-bg inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-bold text-bg disabled:opacity-50"
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

      {error && <p className="text-[13px] text-bad">{error}</p>}

      {result && (
        <div className="rounded-xl border border-[#1f3d2e] bg-[#0e1c16] px-3 py-2.5 text-[12.5px] text-good">
          <div className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 size={14} /> {result.message}
          </div>
          {result.routed_task ? (
            <p className="mt-1 text-good/90">
              Routed to{" "}
              <span className="font-semibold">
                {prettyAgent(result.routed_task.agent_type)}
              </span>
              : {result.routed_task.title}
            </p>
          ) : (
            <p className="mt-1 text-good/90">
              Winslow is triaging it now — it&apos;ll land in the right agent&apos;s
              queue shortly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
