"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi, ApiError } from "@/lib/api";

/**
 * Curated topic ideas by category — the "help me choose" recommendations. A
 * static starter set (AI-personalized recommendations can layer on later).
 */
const CATALOG: { category: string; ideas: string[] }[] = [
  {
    category: "Food & Drink",
    ideas: [
      "a subscription box for rare hot sauces",
      "a ghost kitchen for late-night comfort food",
      "a specialty coffee roaster for home baristas",
    ],
  },
  {
    category: "Retail & Ecommerce",
    ideas: [
      "a curated shop for sustainable home goods",
      "a marketplace for handmade pet accessories",
      "a print-on-demand brand for indie book lovers",
    ],
  },
  {
    category: "Services",
    ideas: [
      "a mobile car-detailing service for busy professionals",
      "a same-day plant-care and delivery service",
      "a concierge booking service for local experiences",
    ],
  },
  {
    category: "Tech & Apps",
    ideas: [
      "an app that turns receipts into budgeting insights",
      "a scheduling tool for small fitness studios",
      "a habit tracker that rewards streaks with real perks",
    ],
  },
  {
    category: "Creative & Media",
    ideas: [
      "a newsletter about small-town food scenes",
      "a podcast network for niche hobbies",
      "a stock-video marketplace for creators",
    ],
  },
  {
    category: "Health & Wellness",
    ideas: [
      "a meal-prep service for specific diets",
      "a booking platform for community yoga classes",
      "a sleep-coaching app with wearable sync",
    ],
  },
  {
    category: "Events",
    ideas: [
      "a balloon and decor company for artistic delivery",
      "a pop-up dinner series for local chefs",
      "a platform for booking backyard micro-weddings",
    ],
  },
  {
    category: "Education",
    ideas: [
      "a tutoring marketplace for coding bootcamp grads",
      "a language-exchange app with live partners",
      "a course platform for hands-on trades",
    ],
  },
  {
    category: "Music & Entertainment",
    ideas: [
      "a subscription box for vinyl record collectors",
      "an app that books local live music gigs",
      "a platform for indie artists to sell merch",
    ],
  },
  {
    category: "Art & Design",
    ideas: [
      "a marketplace for custom digital portraits",
      "a print-on-demand shop for indie illustrators",
      "an app that matches homeowners with local muralists",
    ],
  },
];

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
