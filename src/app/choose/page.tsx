"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi, ApiError } from "@/lib/api";
import { TOPIC_CATALOG as CATALOG } from "@/lib/topicIdeas";

export default function ChoosePage() {
  const router = useRouter();
  const [category, setCategory] = useState<string>("All");
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = ["All", ...CATALOG.map((c) => c.category)];
  const visible =
    category === "All"
      ? CATALOG
      : CATALOG.filter((c) => c.category === category);

  async function start(idea: string) {
    if (starting) return;
    setStarting(idea);
    setError(null);
    try {
      const res = await cytapi.createTopic(idea);
      router.push(`/topic/${res.topic_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't start that topic. Please try again.");
      setStarting(null);
    }
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
          Not sure where to start? Filter by category and pick an idea — your
          agent team takes it from there.
        </p>

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
                  <div
                    key={idea}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4"
                  >
                    <span className="text-[14px] text-ink">{idea}</span>
                    <button
                      type="button"
                      onClick={() => start(idea)}
                      disabled={starting !== null}
                      className="cyt-gradient-bg flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold text-bg disabled:opacity-60"
                    >
                      {starting === idea ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} strokeWidth={2.5} />
                      )}
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
