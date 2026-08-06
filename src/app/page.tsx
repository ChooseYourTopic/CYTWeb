"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cytapi } from "@/lib/api";
import { WILDCARD_TOPICS } from "@/lib/topicIdeas";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useSpeechInput } from "@/hooks/useSpeechInput";

// Playful, business-idea placeholders that rotate through the search input so the
// box reads as a "drop your idea here" workflow entry point. Seeded with a couple
// of extra gags, then padded from the shared "Just for Fun" catalog.
const FUNNY_PLACEHOLDERS: string[] = [
  "a subscription box for haunted dolls",
  "artisanal ice for cocktail snobs",
  "a dating app for houseplants",
  ...WILDCARD_TOPICS,
];

// The guided build path we promote next to the search — invent it, design it,
// learn from it, run with it.
const WORKFLOW_STAGES = ["Invent", "Design", "Learn", "Run"] as const;

export default function LandingPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [phIdx, setPhIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Speech-to-text via the shared hook. Final chunks append to the topic; while
  // listening we preview the interim transcript inline. Hidden when unsupported.
  const speech = useSpeechInput({
    onFinal: (text) =>
      setTopic((prev) => (prev ? `${prev} ${text}` : text).slice(0, 240)),
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed") {
        setNote("Microphone access was blocked — type your idea instead.");
      }
    },
  });

  // Rotate the funny placeholder while the field is empty and idle.
  useEffect(() => {
    const id = window.setInterval(() => {
      setPhIdx((i) => (i + 1) % FUNNY_PLACEHOLDERS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  async function start() {
    const value = topic.trim();
    if (!value || busy) return;
    if (speech.listening) speech.stop();
    setBusy(true);
    setNote(null);
    try {
      const { topic_id } = await cytapi.createTopic(value);
      router.push(`/topic/${topic_id}`);
    } catch {
      // Backend not up yet — go live-soft so the dashboard shows skeletons.
      setNote("Backend not reachable — opening a preview dashboard.");
      const draftId = `draft-${Date.now()}`;
      router.push(`/topic/${draftId}?topic=${encodeURIComponent(value)}`);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    setNote(null);
    speech.toggle();
    inputRef.current?.focus();
  }

  // Show the live transcript inline while dictating, without clobbering state.
  const shownValue =
    speech.listening && speech.interim
      ? `${topic}${topic ? " " : ""}${speech.interim}`
      : topic;

  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />

      <section className="pb-8 pt-16 text-center">
        <h1 className="mx-auto text-[46px] font-bold leading-[1.05] tracking-[-1.2px]">
          One line to <span className="cyt-gradient-text">start</span>.
        </h1>

        {/* The guided build path — invent, design, learn, and run with it. */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
          aria-label="How it works: invent, design, learn, run"
        >
          {WORKFLOW_STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3.5 py-1.5 text-[12.5px] font-semibold text-mut">
                <span className="cyt-gradient-text font-bold">{i + 1}</span>
                {stage}
              </span>
              {i < WORKFLOW_STAGES.length - 1 && (
                <span aria-hidden className="text-[12px] text-dim">
                  ·
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-7">
          <div className="mx-auto flex max-w-2xl items-center gap-2.5 rounded-2xl border border-line bg-panel p-2.5 shadow-[0_20px_60px_-30px_#000]">
            <input
              ref={inputRef}
              aria-label="Your topic"
              className="flex-1 bg-transparent px-3 py-3.5 text-[16px] text-ink outline-none placeholder:text-dim"
              placeholder={`e.g. ${FUNNY_PLACEHOLDERS[phIdx]}`}
              value={shownValue}
              autoComplete="off"
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") start();
              }}
            />

            {speech.supported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={speech.listening}
                aria-label={
                  speech.listening ? "Stop dictation" : "Dictate your topic"
                }
                title={speech.listening ? "Listening… tap to stop" : "Speak your idea"}
                className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border transition-colors ${
                  speech.listening
                    ? "animate-pulse border-transparent bg-brand/20 text-brand"
                    : "border-line bg-panel2 text-mut hover:border-[#31384c] hover:text-ink"
                }`}
              >
                <Mic size={18} strokeWidth={2.2} />
              </button>
            )}

            <button
              onClick={start}
              disabled={busy}
              className="cyt-gradient-bg flex items-center gap-1.5 rounded-xl px-6 py-3.5 text-[15px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? "Starting…" : "Start"}
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Quick-fill playful examples pulled from the shared catalog. */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {FUNNY_PLACEHOLDERS.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className="rounded-full border border-line bg-panel2 px-3 py-1.5 text-[12.5px] text-mut hover:border-[#31384c] hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>

          {note && (
            <p className="mt-3 text-center text-[13px] text-warn">{note}</p>
          )}
        </div>
      </section>

      <footer className="my-9 text-center text-[12px] text-dim">
        {BRAND.APP_NAME} · the real build runs on our own engine, clean-room, on
        our own droplet.
      </footer>
    </main>
  );
}
