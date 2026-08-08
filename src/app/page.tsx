"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mic, Shuffle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cytapi } from "@/lib/api";
import { TOPIC_CATALOG, WILDCARD_TOPICS } from "@/lib/topicIdeas";
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

// The guided build path we promote next to the search. Each stage clicks an
// intent phrase into the SAME topic field so the user just keeps typing (or
// dictating) after it. Learn leads the ladder now.
const WORKFLOW_STAGES = [
  { label: "Learn", intent: "I want to learn " },
  { label: "Invent", intent: "I want to invent " },
  { label: "Design", intent: "I want to design " },
  { label: "Run", intent: "I want to run " },
] as const;

// Each numbered start button gets its own vibrant, brand-friendly accent so the
// 1/2/3/4 chooser reads as four distinct, inviting options (not a muted row).
// Hues are drawn from the palette tokens (blue/purple/green/amber). Kept as
// explicit hex so we can drive inline styles (Tailwind's JIT can't see runtime-
// built class strings) for border / tint / number color.
const STAGE_ACCENTS = [
  { hex: "#6ea8fe", tint: "rgba(110, 168, 254, 0.14)" }, // Learn  → brand blue
  { hex: "#8b7bff", tint: "rgba(139, 123, 255, 0.14)" }, // Invent → brand purple
  { hex: "#3fd08a", tint: "rgba(63, 208, 138, 0.14)" }, // Design → green
  { hex: "#f6c453", tint: "rgba(246, 196, 83, 0.14)" }, // Run    → amber
] as const;

// Every intent prefix — used to detect + swap a leading phrase without nuking
// whatever the user typed after it.
const INTENT_PREFIXES = WORKFLOW_STAGES.map((s) => s.intent);

// "All" plus each catalog category, powering the tumbler's category filter.
const TUMBLER_CATEGORIES = ["All", ...TOPIC_CATALOG.map((c) => c.category)];

const MAX_LEN = 240;

/** Strip any known leading intent phrase, returning just the user's own text. */
function stripIntent(text: string): string {
  for (const prefix of INTENT_PREFIXES) {
    if (text.startsWith(prefix)) return text.slice(prefix.length);
  }
  return text;
}

/** Ideas available for a given tumbler category ("All" flattens the catalog). */
function poolForCategory(category: string): string[] {
  if (category === "All") return TOPIC_CATALOG.flatMap((c) => c.ideas);
  return TOPIC_CATALOG.find((c) => c.category === category)?.ideas ?? [];
}

/** Fisher–Yates sample of up to `n` items (client-only; no SSR randomness). */
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export default function LandingPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [phIdx, setPhIdx] = useState(0);
  const [category, setCategory] = useState<string>("All");
  const [tumbler, setTumbler] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Speech-to-text via the shared hook. Final chunks append to the SAME topic
  // field (so voice adds context after an intent phrase or a picked idea); while
  // listening we preview the interim transcript inline. Hidden when unsupported.
  const speech = useSpeechInput({
    onFinal: (text) =>
      setTopic((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_LEN)),
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed") {
        setNote("Microphone access was blocked — type your idea instead.");
      }
    },
  });

  // Which stage phrase currently leads the field — derived so the highlight stays
  // in sync even when the user edits or swaps the text by hand.
  const activeStage = useMemo(
    () => WORKFLOW_STAGES.find((s) => topic.startsWith(s.intent))?.label ?? null,
    [topic],
  );

  // Rotate the funny placeholder while the field is empty and idle.
  useEffect(() => {
    const id = window.setInterval(() => {
      setPhIdx((i) => (i + 1) % FUNNY_PLACEHOLDERS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  // Re-roll the tumbler on mount and whenever the category changes. Kept in an
  // effect so the random draw only happens client-side (no hydration mismatch).
  useEffect(() => {
    setTumbler(sample(poolForCategory(category), 4 + Math.round(Math.random())));
  }, [category]);

  function shuffleTumbler() {
    setTumbler(sample(poolForCategory(category), 4 + Math.round(Math.random())));
  }

  // Click a stage → swap the leading intent phrase, preserving the user's own
  // trailing text, then drop the cursor back in the field so they keep typing.
  function pickStage(intent: string) {
    setNote(null);
    setTopic((prev) => (intent + stripIntent(prev)).slice(0, MAX_LEN));
    inputRef.current?.focus();
  }

  // Tap a tumbler idea → append it into the field so the user builds up a topic.
  function addIdea(idea: string) {
    setTopic((prev) => {
      const base = prev.trimEnd();
      return (base ? `${base} ${idea}` : idea).slice(0, MAX_LEN);
    });
    inputRef.current?.focus();
  }

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

        {/* Guided build path — click a stage to drop that intent into the box. */}
        <div className="mt-6">
          {/* Real, centered instruction directly above the 1/2/3/4 chooser. */}
          <p className="mb-2.5 text-center text-[12px] font-bold uppercase tracking-[2px] text-mut">
            Choose one
          </p>

          {/* Inward-pointing arrows bracket the four numbered start buttons so
              the eye lands on them ("look here / choose from these"). Arrows are
              decorative → aria-hidden. */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            aria-label="Pick a starting intent: learn, invent, design, run"
          >
            <ArrowRight
              aria-hidden
              size={28}
              strokeWidth={2.5}
              className="hidden shrink-0 text-brand sm:block"
            />

            {WORKFLOW_STAGES.map((stage, i) => {
              const isActive = activeStage === stage.label;
              const accent = STAGE_ACCENTS[i];
              return (
                <div key={stage.label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pickStage(stage.intent)}
                    aria-pressed={isActive}
                    title={`Start with "${stage.intent.trim()}…"`}
                    style={{
                      borderColor: accent.hex,
                      backgroundColor: isActive ? accent.hex : accent.tint,
                      color: isActive ? "#0b0d12" : undefined,
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-[15px] font-semibold shadow-sm transition-colors ${
                      isActive
                        ? "text-bg"
                        : "text-ink hover:brightness-110"
                    }`}
                  >
                    <span
                      className="grid h-6 w-6 place-items-center rounded-full text-[13px] font-extrabold"
                      style={
                        isActive
                          ? { backgroundColor: "rgba(11, 13, 18, 0.18)", color: "#0b0d12" }
                          : { backgroundColor: accent.hex, color: "#0b0d12" }
                      }
                    >
                      {i + 1}
                    </span>
                    {stage.label}
                  </button>
                  {i < WORKFLOW_STAGES.length - 1 && (
                    <span aria-hidden className="text-[12px] text-dim">
                      ·
                    </span>
                  )}
                </div>
              );
            })}

            <ArrowLeft
              aria-hidden
              size={28}
              strokeWidth={2.5}
              className="hidden shrink-0 text-brand sm:block"
            />
          </div>
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
              onChange={(e) => setTopic(e.target.value.slice(0, MAX_LEN))}
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
                title={
                  speech.listening ? "Listening… tap to stop" : "Tap to talk"
                }
                className={`flex h-[46px] shrink-0 items-center gap-2 rounded-xl border px-4 text-[14px] font-semibold transition-colors ${
                  speech.listening
                    ? "animate-pulse border-transparent bg-brand/20 text-brand"
                    : "border-line bg-panel2 text-mut hover:border-brand hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full ${
                    speech.listening ? "bg-brand/30 text-brand" : "bg-brand/15 text-brand"
                  }`}
                >
                  <Mic size={15} strokeWidth={2.4} />
                </span>
                {speech.listening ? "Listening…" : "Tap to talk"}
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

          {/* Idea tumbler — filter by category, shuffle, tap to add to the box. */}
          <div className="mx-auto mt-5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label htmlFor="tumbler-category" className="sr-only">
                Idea category
              </label>
              <select
                id="tumbler-category"
                aria-label="Idea category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-full border border-line bg-panel2 px-3 py-1.5 text-[12.5px] text-mut outline-none hover:border-[#31384c] hover:text-ink focus:border-[#31384c]"
              >
                {TUMBLER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={shuffleTumbler}
                aria-label="Shuffle idea options"
                title="Surprise me — shuffle for fresh ideas"
                className="cyt-gradient-bg inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-bg shadow-[0_8px_24px_-8px_rgba(139,123,255,0.7)] transition-transform hover:scale-[1.04]"
              >
                <Shuffle size={15} strokeWidth={2.6} />
                Shuffle
              </button>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {tumbler.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => addIdea(idea)}
                  title="Add to your topic"
                  className="rounded-full border border-line bg-panel2 px-3 py-1.5 text-[12.5px] text-mut transition-colors hover:border-[#31384c] hover:text-ink"
                >
                  {idea}
                </button>
              ))}
            </div>
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
