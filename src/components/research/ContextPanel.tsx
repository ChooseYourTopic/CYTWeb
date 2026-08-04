"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Upload, Users } from "lucide-react";
import { cytapi, type TopicContext, type SectionItem } from "@/lib/api";

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
 * Context tab — a survey/interview that captures the owner's project context
 * (goals, categories, target market, competitor notes, anything else), shows the
 * agent-generated competitor research, and (next) document uploads.
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
      <div>
        <h3 className="text-[15px] font-semibold">Context survey</h3>
        <p className="text-[13px] text-mut">
          The more your team knows about the project, the sharper the work. Fill
          in what you can — update it anytime.
        </p>
      </div>

      <div className="space-y-3">
        <Field label="Goals" hint="What does success look like?">
          <textarea
            className="cyt-input min-h-[72px]"
            value={ctx.goals ?? ""}
            onChange={(e) => set("goals", e.target.value)}
            placeholder="e.g. reach 100 paying customers in 90 days"
          />
        </Field>
        <Field label="Categories" hint="Comma-separated tags">
          <input
            className="cyt-input"
            value={ctx.categories ?? ""}
            onChange={(e) => set("categories", e.target.value)}
            placeholder="e.g. events, retail, local delivery"
          />
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
            <span
              className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}
            >
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
