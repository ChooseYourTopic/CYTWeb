"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Upload,
  Users,
  TrendingUp,
  Mic,
  Square,
  Sparkles,
} from "lucide-react";
import {
  cytapi,
  type TopicContext,
  type SectionItem,
  type ContextExtraction,
} from "@/lib/api";
import { useSpeechInput } from "@/hooks/useSpeechInput";

const CATEGORY_OPTIONS = [
  "Food & Drink",
  "Retail & Ecommerce",
  "Services",
  "Tech & Apps",
  "Creative & Media",
  "Health & Wellness",
  "Events",
  "Education",
];

// Illustrative "typical early valuation" per space (rough, not market data).
const CATEGORY_VALUATION: Record<string, number> = {
  "Food & Drink": 750_000,
  "Retail & Ecommerce": 1_200_000,
  Services: 600_000,
  "Tech & Apps": 3_500_000,
  "Creative & Media": 900_000,
  "Health & Wellness": 2_000_000,
  Events: 500_000,
  Education: 1_500_000,
};

const SAMPLE_GOALS = [
  "Reach 100 paying customers in 90 days",
  "Launch an MVP in 30 days",
  "Hit $10k in monthly revenue",
];

function formatValuation(n: number): string {
  return n >= 1_000_000
    ? `~$${(n / 1_000_000).toFixed(1)}M`
    : `~$${Math.round(n / 1000)}K`;
}

/**
 * Illustrative valuation for a company in this space. Starts from the selected
 * categories, then shifts with the target market, competitor awareness, and the
 * extra context provided. Rough — not real market data.
 */
function computeValuation(ctx: TopicContext, cats: string[]): number {
  const catVals = cats.map((c) => CATEGORY_VALUATION[c]).filter(Boolean);
  let value = catVals.length
    ? catVals.reduce((a, b) => a + b, 0) / catVals.length
    : 1_000_000;

  // Target market shapes scale.
  const tm = (ctx.target_market ?? "").toLowerCase();
  if (/enterprise|b2b|corporate|premium|luxury|professional/.test(tm)) value *= 1.4;
  if (/global|nationwide|national|worldwide|scale/.test(tm)) value *= 1.3;
  if (/local|neighborhood|hobby|small|niche|community/.test(tm)) value *= 0.75;
  if (tm.trim().length > 40) value *= 1.1; // a well-defined market

  // Competitor awareness signals a real, validated market.
  const comp = (ctx.competitor_notes ?? "").trim();
  if (comp.length > 0) value *= 1.1;
  if (comp.length > 120) value *= 1.1;

  // Extra context adds a little refinement (capped).
  const notes = (ctx.notes ?? "").trim();
  value *= 1 + Math.min(notes.length, 400) / 4000;

  return Math.round(value);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {hint && <span className="ml-1.5 text-[12px] text-dim">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/**
 * Context tab — a survey/interview capturing the owner's project context
 * (goals, category bubbles, target market, competitor notes, anything else),
 * with a rough market valuation up top, the agent competitor research, and
 * (next) document uploads.
 */
export function ContextPanel({ topicId }: { topicId: string }) {
  const [ctx, setCtx] = useState<TopicContext>({});
  const [competitors, setCompetitors] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    cytapi
      .topicContext(topicId)
      .then((r) => {
        if (!cancelled) setCtx(r.context || {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    cytapi
      .section(topicId, "competitors")
      .then((items) => {
        if (!cancelled) setCompetitors(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  function set<K extends keyof TopicContext>(k: K, v: string) {
    setCtx((prev) => ({ ...prev, [k]: v }));
  }

  // --- Voice recorder → structured context extraction ---
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);
  const speech = useSpeechInput({
    onFinal: (t) => setTranscript((prev) => (prev ? `${prev} ${t}` : t)),
  });

  function applyExtraction(ex: ContextExtraction) {
    setCtx((prev) => {
      const cats = new Set(
        (prev.categories ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      ex.categories.forEach((c) => cats.add(c)); // auto-select the surfaced tags

      const appendLine = (cur: string | null | undefined, add: string) => {
        const a = add.trim();
        if (!a) return cur ?? "";
        const c = (cur ?? "").trimEnd();
        return c ? `${c}\n${a}` : a;
      };

      return {
        ...prev,
        categories: [...cats].join(", "),
        goals: appendLine(prev.goals, ex.goals),
        target_market: (prev.target_market ?? "").trim()
          ? prev.target_market
          : ex.target_market || prev.target_market,
        competitor_notes: appendLine(prev.competitor_notes, ex.competitor_notes),
        notes: appendLine(prev.notes, ex.notes),
      };
    });
  }

  async function extractNow() {
    const t = transcript.trim();
    if (!t || extracting) return;
    setExtracting(true);
    setMsg(null);
    try {
      const { extracted } = await cytapi.extractContext(topicId, t);
      applyExtraction(extracted);
      setTranscript("");
      const n = extracted.categories.length;
      setMsg({
        ok: true,
        text: `Added to context — ${n} categor${n === 1 ? "y" : "ies"} flagged. Review the bubbles below, deselect any that don't fit, then Save.`,
      });
    } catch {
      setMsg({ ok: false, text: "Couldn't process that description — try again." });
    } finally {
      setExtracting(false);
    }
  }

  // Categories are multi-select bubbles, persisted as a comma-joined string.
  const selectedCats = new Set(
    (ctx.categories ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  function toggleCat(c: string) {
    const next = new Set(selectedCats);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    set("categories", [...next].join(", "));
  }

  function addGoal(g: string) {
    setCtx((prev) => {
      const cur = prev.goals ?? "";
      if (cur.includes(g)) return prev;
      return { ...prev, goals: cur ? `${cur.trimEnd()}\n${g}` : g };
    });
  }

  // Rough valuation — categories + target market + competitor notes + context.
  const valuation = computeValuation(ctx, [...selectedCats]);

  // The fixed spaces PLUS any tags surfaced from a recording — all toggleable.
  const allCategories = Array.from(new Set([...CATEGORY_OPTIONS, ...selectedCats]));

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.saveTopicContext(topicId, {
        goals: ctx.goals ?? "",
        categories: ctx.categories ?? "",
        target_market: ctx.target_market ?? "",
        competitor_notes: ctx.competitor_notes ?? "",
        notes: ctx.notes ?? "",
      });
      setMsg({ ok: true, text: "Saved." });
    } catch {
      setMsg({ ok: false, text: "Couldn't save. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[14px] text-mut">
        <Loader2 size={16} className="animate-spin" /> Loading context…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header — survey intro + rough market valuation top-right. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold">Context survey</h3>
          <p className="text-[13px] text-mut">
            The more your team knows, the sharper the work. Fill in what you can.
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1 text-[10.5px] uppercase tracking-wide text-mut">
            <TrendingUp size={11} className="text-brand" /> Est. valuation in this
            space
          </div>
          <div className="text-[19px] font-bold text-ink">
            {formatValuation(valuation)}
          </div>
          <div className="text-[10.5px] text-dim">rough estimate</div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Voice recorder → auto-extract context. Sits above the survey fields. */}
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Sparkles size={14} className="text-brand" /> Describe your idea out loud
          </div>
          <p className="mb-2 text-[12px] text-mut">
            Record a quick description — we&apos;ll transcribe it and pull out your
            goals, categories, and market. Category tags appear pre-selected below;
            keep the ones that fit and deselect the rest, then Save.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {speech.supported && (
              <button
                type="button"
                onClick={() => {
                  if (speech.listening) speech.stop();
                  else {
                    setTranscript("");
                    speech.start();
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  speech.listening
                    ? "animate-pulse border-bad/50 bg-bad/10 text-bad"
                    : "border-line bg-panel2 text-ink hover:border-[#31384c]"
                }`}
              >
                {speech.listening ? <Square size={13} /> : <Mic size={13} />}
                {speech.listening ? "Stop" : "Record"}
              </button>
            )}
            <button
              type="button"
              onClick={extractNow}
              disabled={!transcript.trim() || extracting || speech.listening}
              className="cyt-gradient-bg inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold text-bg disabled:opacity-50"
            >
              {extracting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              Add to context
            </button>
            {speech.listening && (
              <span className="text-[12px] font-semibold text-brand">
                ● listening…
              </span>
            )}
          </div>

          {speech.listening ? (
            <div className="mt-2 min-h-[60px] rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-ink/90">
              {transcript}{" "}
              <span className="text-mut">{speech.interim}</span>
              {!transcript && !speech.interim && (
                <span className="text-dim">Listening… start describing your idea.</span>
              )}
            </div>
          ) : (
            <textarea
              className="cyt-input mt-2 w-full resize-y text-[13px]"
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                speech.supported
                  ? "…your recorded words appear here (you can edit them before adding)"
                  : "Voice input isn't supported in this browser — type your idea and we'll extract the context."
              }
            />
          )}
          {speech.error === "not-allowed" && (
            <p className="mt-1.5 text-[11.5px] text-warn">
              Microphone access was blocked — allow it in your browser to record.
            </p>
          )}
        </div>

        <Field label="Goals" hint="What does success look like?">
          <textarea
            className="cyt-input min-h-[72px]"
            value={ctx.goals ?? ""}
            onChange={(e) => set("goals", e.target.value)}
            placeholder="e.g. reach 100 paying customers in 90 days"
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-dim">Examples:</span>
            {SAMPLE_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => addGoal(g)}
                className="rounded-full border border-line px-2.5 py-1 text-[12px] text-mut transition-colors hover:text-ink"
              >
                + {g}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Categories" hint="Pick any that fit — recorded tags appear pre-selected">
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map((c) => {
              const on = selectedCats.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    on
                      ? "border-[#31384c] bg-panel2 text-ink"
                      : "border-line text-mut hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Target market" hint="Who is this for?">
          <textarea
            className="cyt-input min-h-[60px]"
            value={ctx.target_market ?? ""}
            onChange={(e) => set("target_market", e.target.value)}
            placeholder="e.g. event planners in the Chicago metro"
          />
        </Field>
        <Field label="Your competitor notes" hint="Rivals you already know of">
          <textarea
            className="cyt-input min-h-[60px]"
            value={ctx.competitor_notes ?? ""}
            onChange={(e) => set("competitor_notes", e.target.value)}
            placeholder="Names, links, what they do well or poorly"
          />
        </Field>
        <Field label="Anything else" hint="Any other context the team should have">
          <textarea
            className="cyt-input min-h-[80px]"
            value={ctx.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Constraints, brand voice, must-haves…"
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save context
          </button>
          {msg && (
            <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Agent-generated competitor research */}
      <div className="rounded-[11px] border border-line bg-panel2 p-4">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Users size={15} className="text-brand" /> Competitor research
        </div>
        <p className="mt-1 text-[13px] text-mut">
          What your research agent has mapped so far.
        </p>
        <div className="mt-3 space-y-2">
          {competitors.length === 0 ? (
            <p className="text-[13px] text-dim">
              No competitor research yet — your agents add rivals here as they
              find them.
            </p>
          ) : (
            competitors.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-line bg-panel p-3"
              >
                <div className="text-[13.5px] font-semibold text-ink">
                  {c.title}
                </div>
                {c.summary && (
                  <div className="text-[13px] text-mut">{c.summary}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document uploads — next layer */}
      <div className="rounded-[11px] border border-dashed border-line bg-panel/40 p-5 text-center">
        <Upload size={22} className="mx-auto text-dim" />
        <p className="mt-2 text-[13.5px] text-ink">Document uploads</p>
        <p className="mt-1 text-[12.5px] text-mut">
          Attach briefs, brand guides, or research for your team to use. Coming
          next.
        </p>
      </div>
    </div>
  );
}
