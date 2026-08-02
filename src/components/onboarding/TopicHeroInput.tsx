"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cytapi } from "@/lib/api";
import { SAMPLE_TOPICS } from "@/lib/brand";

/**
 * The one-line topic entry. Submitting POSTs the topic to create/seed the
 * company, then routes to the living dashboard. Fail-soft: if the backend is
 * down, we still route with a client-generated id so the dashboard renders its
 * "report being written" skeleton state.
 */
export function TopicHeroInput() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function start() {
    const value = topic.trim();
    if (!value || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const { topic_id } = await cytapi.createTopic(value);
      router.push(`/topic/${topic_id}`);
    } catch {
      // Backend not up yet — go live-soft so the dashboard shows skeletons.
      setNote("Backend not reachable — opening a preview dashboard.");
      const draftId = `draft-${Date.now()}`;
      router.push(
        `/topic/${draftId}?topic=${encodeURIComponent(value)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mx-auto flex max-w-2xl gap-2.5 rounded-2xl border border-line bg-panel p-2.5 shadow-[0_20px_60px_-30px_#000]">
        <input
          aria-label="Your topic"
          className="flex-1 bg-transparent px-3 py-3.5 text-[16px] text-ink outline-none placeholder:text-dim"
          placeholder="e.g. a subscription box for rare hot sauces"
          value={topic}
          autoComplete="off"
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") start();
          }}
        />
        <button
          onClick={start}
          disabled={busy}
          className="cyt-gradient-bg flex items-center gap-1.5 rounded-xl px-6 text-[15px] font-bold text-bg disabled:opacity-60"
        >
          {busy ? "Starting…" : "Start"}
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SAMPLE_TOPICS.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => setTopic(s)}
            className="rounded-full border border-line bg-panel2 px-3 py-1.5 text-[12.5px] text-mut hover:border-[#31384c] hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>

      <p className="mt-3.5 text-center text-[13px] text-dim">
        No setup. The team decides the name, positioning, and plan — you steer as
        it works.
      </p>
      {note && (
        <p className="mt-2 text-center text-[13px] text-warn">{note}</p>
      )}
    </div>
  );
}
