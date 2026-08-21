"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Plus,
  Sparkles,
  Lightbulb,
  Boxes,
  ClipboardList,
  Rocket,
  CircleDollarSign,
  Mic,
  MicOff,
  Shuffle,
  PencilLine,
  Dices,
  BookOpen,
  Palette,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  ApiError,
  type AiExperience,
  type BusinessExperience,
  type SocialPlatform,
} from "@/lib/api";
import { FOCUS_IDEAS, WILDCARD_TOPICS } from "@/lib/topicIdeas";
import { useSpeechInput } from "@/hooks/useSpeechInput";

type Clarity = "know" | "idea";
type YesNo = "yes" | "no";
type TopicMode = "know" | "random";

/** Pick a random curated idea appropriate to the selected focus (reuses /choose). */
function rollRandomTopic(focus: string): string {
  const ideas = FOCUS_IDEAS[focus]?.ideas ?? [];
  if (ideas.length === 0) return "";
  return ideas[Math.floor(Math.random() * ideas.length)];
}

/** Approachable suggestion pool for the simplified (New-to-AI) view. */
const SIMPLE_IDEAS = FOCUS_IDEAS["invent"]?.ideas ?? WILDCARD_TOPICS;

const PLATFORMS: { key: SocialPlatform; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X (Twitter)" },
];

/** The four friendly intents on the simplified view (the admin-landing style). */
const SIMPLE_INTENTS = [
  { key: "learn", label: "Learn", icon: BookOpen },
  { key: "invent", label: "Invent", icon: Lightbulb },
  { key: "design", label: "Design", icon: Palette },
  { key: "run", label: "Run", icon: Rocket },
] as const;

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; sub?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            value === o.key
              ? "border-[#31384c] bg-panel2"
              : "border-line hover:border-[#31384c]"
          }`}
        >
          <div className="text-[14px] font-semibold text-ink">{o.label}</div>
          {o.sub && <div className="text-[12px] text-mut">{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

export default function StartPage() {
  const router = useRouter();

  // Flow: a single AI-familiarity GATE, then a branch —
  //   'gate'     — only the AI-familiarity question is shown.
  //   'simple'   — New to AI: the simplified, guided one-line view.
  //   'advanced' — Veteran: the full advanced flow (progressive questions → topic).
  const [phase, setPhase] = useState<"gate" | "simple" | "advanced">("gate");

  const [ai, setAi] = useState<AiExperience | null>(null);
  const [biz, setBiz] = useState<BusinessExperience | null>(null);
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [hasWebsite, setHasWebsite] = useState<YesNo | null>(null);
  const [website, setWebsite] = useState("");
  const [usesSocial, setUsesSocial] = useState<YesNo | null>(null);
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform | null>(null);
  const [socialHandle, setSocialHandle] = useState("");

  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("invent");
  const [topicMode, setTopicMode] = useState<TopicMode>("know");
  const [advStep, setAdvStep] = useState<"questions" | "topic">("questions");
  const [simpleIntent, setSimpleIntent] = useState<string>("invent");

  const {
    supported: micSupported,
    listening,
    interim,
    toggle: toggleMic,
    stop: stopMic,
  } = useSpeechInput({
    continuous: false,
    onFinal: (chunk) =>
      setTopic((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk)),
  });

  function pickRandom() {
    stopMic();
    setTopicMode("random");
    setError(null);
    const idea = rollRandomTopic(stage);
    if (idea) setTopic(idea);
  }

  // Leaving the gate: New to AI → the simple guided view; Veteran → the advanced flow.
  function continueFromGate() {
    if (!ai) return;
    setPhase(ai === "new" ? "simple" : "advanced");
    if (ai === "new") setTopic("");
  }

  const advQuestionsReady = Boolean(biz && clarity && hasWebsite && usesSocial);

  function toAdvancedTopic() {
    if (!advQuestionsReady) return;
    cytapi
      .updatePreferences({
        ai_experience: ai,
        business_experience: biz,
        website: hasWebsite === "yes" ? website.trim() || null : null,
        social_platform: usesSocial === "yes" ? socialPlatform : null,
        social_handle: usesSocial === "yes" ? socialHandle.trim() || null : null,
      })
      .catch(() => {});
    setAdvStep("topic");
  }

  async function start(override?: string) {
    const t = (override ?? topic).trim();
    if (!t || busy) return;
    stopMic();
    setBusy(true);
    setError(null);
    // Best-effort: record the New-to-AI persona so the dashboard tailors itself.
    if (phase === "simple") {
      cytapi.updatePreferences({ ai_experience: "new" }).catch(() => {});
    }
    try {
      const res = await cytapi.createTopic(t);
      router.push(`/topic/${res.topic_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't start that topic. Please try again.");
      setBusy(false);
    }
  }

  /* --------------------------------- render -------------------------------- */

  // GATE — only the AI-familiarity question, revealed alone. Continue appears once answered.
  if (phase === "gate") {
    return (
      <main className="mx-auto max-w-[560px] px-6 pb-24">
        <SiteHeader />
        <section className="mt-16 space-y-6">
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">
            Let&apos;s get you started
          </h1>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-mut">
              How familiar are you with AI?
            </div>
            <Choice<AiExperience>
              options={[
                { key: "new", label: "New to AI", sub: "Keep it simple" },
                { key: "advanced", label: "Veteran", sub: "Advanced" },
              ]}
              value={ai}
              onChange={setAi}
            />
          </div>
          {ai && (
            <button
              onClick={continueFromGate}
              className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg"
            >
              Continue <ArrowRight size={16} />
            </button>
          )}
        </section>
      </main>
    );
  }

  // SIMPLE — New to AI: the guided, one-line start (admin-landing style).
  if (phase === "simple") {
    return (
      <main className="mx-auto max-w-[720px] px-6 pb-24 text-center">
        <SiteHeader />
        <section className="mt-14">
          <button
            type="button"
            onClick={() => setPhase("gate")}
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <h1 className="text-[34px] font-bold tracking-[-0.6px]">
            One line to <span className="text-brand">start</span>.
          </h1>
          <p className="mt-2 text-[14px] text-mut">
            Tell us your idea in a sentence — we&apos;ll do the rest.
          </p>

          <div className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-dim">
            Choose one
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {SIMPLE_INTENTS.map((it) => {
              const active = simpleIntent === it.key;
              const Icon = it.icon;
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setSimpleIntent(it.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                    active
                      ? "cyt-gradient-bg border-transparent text-bg"
                      : "border-line bg-panel2 text-mut hover:text-ink"
                  }`}
                >
                  <Icon size={14} /> {it.label}
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-5 flex max-w-[560px] gap-2">
            <div className="cyt-input flex flex-1 items-center gap-2 p-0 pr-2 text-left">
              <input
                className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-[14px] text-ink outline-none placeholder:text-dim"
                value={listening && interim ? `${topic ? `${topic} ` : ""}${interim}` : topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. artisanal ice for cocktail snobs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") start();
                }}
              />
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-pressed={listening}
                  aria-label={listening ? "Stop dictation" : "Tap to talk"}
                  title={listening ? "Stop dictation" : "Tap to talk"}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                    listening ? "text-bad" : "text-mut hover:text-ink"
                  }`}
                >
                  {listening ? <MicOff size={15} /> : <Mic size={15} />} Tap to talk
                </button>
              )}
            </div>
            <button
              onClick={() => start()}
              disabled={busy || !topic.trim()}
              className="cyt-gradient-bg flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Start
            </button>
          </div>

          {listening && (
            <p className="mt-2 text-[12px] text-bad">Listening… say your idea.</p>
          )}
          {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setTopic(SIMPLE_IDEAS[Math.floor(Math.random() * SIMPLE_IDEAS.length)] ?? "")}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3 py-1.5 text-[12px] font-semibold text-mut hover:text-ink"
            >
              <Shuffle size={13} /> Shuffle
            </button>
          </div>

          <div className="mx-auto mt-5 flex max-w-[620px] flex-wrap justify-center gap-2">
            {SIMPLE_IDEAS.slice(0, 5).map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => start(idea)}
                disabled={busy}
                className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12.5px] text-mut transition-colors hover:border-[#31384c] hover:text-ink disabled:opacity-60"
              >
                {idea}
              </button>
            ))}
          </div>

          <p className="mt-8 text-[12px] text-dim">
            ChooseYourTopic · the real build runs on our own engine, on our own droplet.
          </p>
        </section>
      </main>
    );
  }

  // ADVANCED — Veteran: the full flow. Questions reveal one at a time, then the topic step.
  return (
    <main className="mx-auto max-w-[640px] px-6 pb-24">
      <SiteHeader />
      <section className="mt-10">
        <div className="flex items-center gap-2 text-[12px] text-dim">
          <span className={advStep === "questions" ? "font-semibold text-ink" : ""}>
            1. About you
          </span>
          <ArrowRight size={12} />
          <span className={advStep === "topic" ? "font-semibold text-ink" : ""}>
            2. Your topic
          </span>
        </div>

        {advStep === "questions" ? (
          <div className="mt-6 space-y-6">
            <button
              type="button"
              onClick={() => setPhase("gate")}
              className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 className="text-[26px] font-bold tracking-[-0.5px]">
              Let&apos;s get you set up
            </h1>

            <div className="space-y-4">
              {/* Questions reveal one at a time as the prior is answered. */}
              <div>
                <div className="mb-2 text-[13px] font-semibold text-mut">
                  And with running a business?
                </div>
                <Choice<BusinessExperience>
                  options={[
                    { key: "new", label: "New business owner" },
                    { key: "experienced", label: "Experienced owner" },
                  ]}
                  value={biz}
                  onChange={setBiz}
                />
              </div>

              {biz && (
                <div>
                  <div className="mb-2 text-[13px] font-semibold text-mut">
                    Where are you with your idea?
                  </div>
                  <Choice<Clarity>
                    options={[
                      { key: "know", label: "I know exactly what I want" },
                      { key: "idea", label: "I just have an idea" },
                    ]}
                    value={clarity}
                    onChange={setClarity}
                  />
                </div>
              )}

              {clarity && (
                <div>
                  <div className="mb-2 text-[13px] font-semibold text-mut">
                    Do you have a website?
                  </div>
                  <Choice<YesNo>
                    options={[
                      { key: "yes", label: "Yes" },
                      { key: "no", label: "No" },
                    ]}
                    value={hasWebsite}
                    onChange={setHasWebsite}
                  />
                  {hasWebsite === "yes" && (
                    <input
                      className="cyt-input mt-2"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="yourwebsite.com"
                    />
                  )}
                </div>
              )}

              {hasWebsite && (
                <div>
                  <div className="mb-2 text-[13px] font-semibold text-mut">
                    Are you using social media?
                  </div>
                  <Choice<YesNo>
                    options={[
                      { key: "yes", label: "Yes" },
                      { key: "no", label: "No" },
                    ]}
                    value={usesSocial}
                    onChange={setUsesSocial}
                  />
                  {usesSocial === "yes" && (
                    <div className="mt-2 space-y-2">
                      <div className="text-[12px] text-dim">Your top platform</div>
                      <div className="grid grid-cols-4 gap-2">
                        {PLATFORMS.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setSocialPlatform(p.key)}
                            className={`rounded-xl border px-2 py-2 text-[12.5px] font-semibold transition-colors ${
                              socialPlatform === p.key
                                ? "border-[#31384c] bg-panel2 text-ink"
                                : "border-line text-mut hover:text-ink"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {socialPlatform && (
                        <input
                          className="cyt-input"
                          value={socialHandle}
                          onChange={(e) => setSocialHandle(e.target.value)}
                          placeholder={`Your ${
                            PLATFORMS.find((p) => p.key === socialPlatform)?.label
                          } handle (@…)`}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {advQuestionsReady && (
              <button
                onClick={toAdvancedTopic}
                className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg"
              >
                Continue <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <button
              type="button"
              onClick={() => setAdvStep("questions")}
              className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} /> Back
            </button>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  { key: "invent", label: "Invent", hint: "Shape the idea", icon: Lightbulb },
                  { key: "organize", label: "Organize", hint: "Structure it", icon: Boxes },
                  { key: "plan", label: "Plan", hint: "Map the work", icon: ClipboardList },
                  { key: "implement", label: "Implement", hint: "Build & ship", icon: Rocket },
                  { key: "fund", label: "Fund Business", hint: "Raise & budget", icon: CircleDollarSign },
                ] as const
              ).map((s) => {
                const active = stage === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setStage(s.key);
                      if (topicMode === "random") setTopic(rollRandomTopic(s.key));
                    }}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "cyt-gradient-bg border-transparent text-bg"
                        : "border-line bg-panel2 text-mut hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-bold">
                      <Icon size={15} /> {s.label}
                    </span>
                    <span className={`text-[11px] ${active ? "text-bg/80" : "text-dim"}`}>
                      {s.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={topicMode === "know"}
                onClick={() => {
                  setTopicMode("know");
                  setError(null);
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  topicMode === "know"
                    ? "border-[#31384c] bg-panel2 text-ink"
                    : "border-line text-mut hover:text-ink"
                }`}
              >
                <PencilLine size={15} className="shrink-0 text-brand" />
                <span className="text-[13px] font-semibold">I know what I want</span>
              </button>
              <button
                type="button"
                aria-pressed={topicMode === "random"}
                onClick={pickRandom}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  topicMode === "random"
                    ? "border-[#31384c] bg-panel2 text-ink"
                    : "border-line text-mut hover:text-ink"
                }`}
              >
                <Dices size={15} className="shrink-0 text-brand" />
                <span className="text-[13px] font-semibold">Random</span>
              </button>
            </div>

            <p className="text-[14px] text-mut">
              {topicMode === "random"
                ? "We picked one for your focus — tweak it, shuffle, or hit Start."
                : "Type or dictate your topic, or pick one of the ideas below."}
            </p>

            <div className="flex gap-2">
              <div className="cyt-input flex flex-1 items-center gap-2 p-0 pr-2">
                <input
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[14px] text-ink outline-none placeholder:text-dim"
                  value={listening && interim ? `${topic ? `${topic} ` : ""}${interim}` : topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. a subscription box for rare houseplants"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") start();
                  }}
                />
                {topicMode === "random" && (
                  <button
                    type="button"
                    onClick={() => setTopic(rollRandomTopic(stage))}
                    aria-label="Shuffle a new topic"
                    title="Shuffle a new topic"
                    className="shrink-0 rounded-lg p-1.5 text-mut transition-colors hover:text-ink"
                  >
                    <Shuffle size={16} />
                  </button>
                )}
                {micSupported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-pressed={listening}
                    aria-label={listening ? "Stop dictation" : "Dictate your topic"}
                    title={listening ? "Stop dictation" : "Dictate your topic"}
                    className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                      listening ? "text-bad" : "text-mut hover:text-ink"
                    }`}
                  >
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
              </div>
              <button
                onClick={() => start()}
                disabled={busy || !topic.trim()}
                className="cyt-gradient-bg flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} strokeWidth={2.5} />
                )}
                Start
              </button>
            </div>
            {listening && (
              <p className="text-[12px] text-bad">Listening… speak your topic.</p>
            )}
            {error && <p className="text-[13px] text-bad">{error}</p>}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href="/choose"
                  className="text-[13px] font-semibold text-mut transition-colors hover:text-ink hover:underline"
                >
                  Recommended topics
                </Link>
                <Link
                  href="/choose"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline"
                >
                  <Sparkles size={12} /> See all
                </Link>
              </div>
              <p className="mb-3 text-[12px] text-dim">{FOCUS_IDEAS[stage]?.blurb}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(FOCUS_IDEAS[stage]?.ideas ?? []).map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => start(idea)}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-line bg-panel p-3 text-left text-[13px] text-ink transition-colors hover:border-[#31384c] disabled:opacity-60"
                  >
                    <Plus size={14} className="shrink-0 text-brand" /> {idea}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[13px] font-semibold text-mut">
                  Feeling silly? 🤪
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WILDCARD_TOPICS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => start(idea)}
                      disabled={busy}
                      className="rounded-full border border-line bg-panel2 px-3 py-1.5 text-[12px] text-mut transition-colors hover:border-[#31384c] hover:text-ink disabled:opacity-60"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
