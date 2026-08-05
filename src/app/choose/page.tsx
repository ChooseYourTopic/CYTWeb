"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi, ApiError } from "@/lib/api";
import { TOPIC_CATALOG as CATALOG } from "@/lib/topicIdeas";

export default function ChoosePage() {
  const router = useRouter();
  const [category, setCategory] = useState<string>("All");
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = ["All", ...CATALOG.map((c) => c.category)];
  const visible =
    category === "All"
      ? CATALOG
      : CATALOG.filter((c) => c.category === category);

  async function start() {
    const t = topic.trim();
    if (!t || starting) return;
    setStarting(true);
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
      setStarting(false);
    }
  }

  // Tapping an idea fills the search field (no per-item button); edit then Start.
  function pick(idea: string) {
    setTopic(idea);
    inputRef.current?.focus();
  }

  return (
    <main className="mx-auto max-w-[980px] px-6 pb-24">
      <SiteHeader />

      <section className="mx-auto mt-10 max-w-[820px]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to your topics
        </Link>

        <div className="mt-4 flex items-center gap-2">
          <Sparkles size={20} className="text-brand" />
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">
            Help me choose a topic
          </h1>
        </div>
        <p className="mt-1 text-[14px] text-mut">
          Not sure where to start? Tap any idea to drop it in the box, tweak it if
          you like, then start — your agent team takes it from there.
        </p>

        {/* Search box — tapping an idea below fills this; edit and Start. */}
        <div className="mt-5 flex gap-2">
          <input
            ref={inputRef}
            className="cyt-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Type a topic, or tap an idea below"
            onKeyDown={(e) => {
              if (e.key === "Enter") start();
            }}
          />
          <button
            onClick={start}
            disabled={starting || !topic.trim()}
            className="cyt-gradient-bg flex shrink-0 items-center gap-1.5 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
          >
            {starting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} strokeWidth={2.5} />
            )}
            Start
          </button>
        </div>

        {/* Category filters */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                category === c
                  ? "border-[#31384c] bg-panel2 text-ink"
                  : "border-line text-mut hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}

        {/* Recommendations */}
        <div className="mt-6 space-y-6">
          {visible.map((group) => (
            <div key={group.category}>
              <h2 className="mb-2 text-[12px] uppercase tracking-wider text-dim">
                {group.category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => pick(idea)}
                    className={`flex items-center gap-2 rounded-2xl border p-4 text-left text-[14px] transition-colors ${
                      topic === idea
                        ? "border-[#31384c] bg-panel2 text-ink"
                        : "border-line bg-panel text-ink hover:border-[#31384c]"
                    }`}
                  >
                    <Plus size={14} className="shrink-0 text-brand" />
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
