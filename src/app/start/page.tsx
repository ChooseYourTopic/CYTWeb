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

type Clarity = "know" | "idea";
type YesNo = "yes" | "no";

const PLATFORMS: { key: SocialPlatform; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X (Twitter)" },
];

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
  const [step, setStep] = useState<1 | 2>(1);
  const [ai, setAi] = useState<AiExperience | null>(null);
  const [biz, setBiz] = useState<BusinessExperience | null>(null);
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [hasWebsite, setHasWebsite] = useState<YesNo | null>(null);
  const [website, setWebsite] = useState("");
  const [usesSocial, setUsesSocial] = useState<YesNo | null>(null);
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform | null>(
    null,
  );
  const [socialHandle, setSocialHandle] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Independent focus selector on step 2 — a user can pick any of these anytime.
  const [stage, setStage] = useState<string>("invent");

  const step1Ready = Boolean(ai && biz && clarity && hasWebsite && usesSocial);

  function toStep2() {
    if (!step1Ready) return;
    // Persist the persona + web/social presence — best-effort, don't block.
    cytapi
      .updatePreferences({
        ai_experience: ai,
        business_experience: biz,
        website: hasWebsite === "yes" ? website.trim() || null : null,
        social_platform: usesSocial === "yes" ? socialPlatform : null,
        social_handle:
          usesSocial === "yes" ? socialHandle.trim() || null : null,
      })
      .catch(() => {});
    setStep(2);
  }

  async function start(override?: string) {
    const t = (override ?? topic).trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
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

  return (
    <main className="mx-auto max-w-[640px] px-6 pb-24">
      <SiteHeader />

      <section className="mt-10">
        <div className="flex items-center gap-2 text-[12px] text-dim">
          <span className={step >= 1 ? "font-semibold text-ink" : ""}>
            1. About you
          </span>
          <ArrowRight size={12} />
          <span className={step >= 2 ? "font-semibold text-ink" : ""}>
            2. Your topic
          </span>
        </div>

        {step === 1 ? (
          <div className="mt-6 space-y-6">
            <h1 className="text-[26px] font-bold tracking-[-0.5px]">
              Let&apos;s get you set up
            </h1>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[13px] font-semibold text-mut">
                  How familiar are you with AI?
                </div>
                <Choice<AiExperience>
                  options={[
                    { key: "new", label: "New to AI" },
                    { key: "advanced", label: "Veteran", sub: "Advanced" },
                  ]}
                  value={ai}
                  onChange={setAi}
                />
              </div>
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
                    <div className="text-[12px] text-dim">
                      Your top platform
                    </div>
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
            </div>

            <button
              onClick={toStep2}
              disabled={!step1Ready}
              className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {/* Five independent focuses — pick any, any time. */}
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
                    onClick={() => setStage(s.key)}
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
            <p className="text-[14px] text-mut">
              Type your topic, or pick one of the ideas below.
            </p>

            <div className="flex gap-2">
              <input
                className="cyt-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. a subscription box for rare houseplants"
                onKeyDown={(e) => {
                  if (e.key === "Enter") start();
                }}
              />
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
            {error && <p className="text-[13px] text-bad">{error}</p>}

            {/* Categories + suggestions to help them get started. */}
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
              <p className="mb-3 text-[12px] text-dim">
                {FOCUS_IDEAS[stage]?.blurb}
              </p>
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

              {/* Feeling silly? Always-visible playful pre-selects. */}
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
