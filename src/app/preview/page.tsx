"use client";

import Link from "next/link";
import {
  Fingerprint,
  Lock,
  Sparkles,
  Bot,
  BarChart3,
  BadgeCheck,
  LifeBuoy,
  ShieldCheck,
  Mail,
  CreditCard,
  Trophy,
  CheckCircle2,
  Zap,
  ChevronRight,
  Factory,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

type Status = "shipped" | "armed";

type Station = {
  icon: typeof Bot;
  title: string;
  blurb: string;
  status: Status;
};

/** The build, station by station — each a completed system on the line. */
const STATIONS: Station[] = [
  {
    icon: Fingerprint,
    title: "Identity & Sign-In",
    blurb: "Phone code, email + password, magic link — with short + long tokens so you stay in.",
    status: "shipped",
  },
  {
    icon: Sparkles,
    title: "One Line → A Company",
    blurb: "A single topic spins up a whole AI-run business, ready to work.",
    status: "shipped",
  },
  {
    icon: Bot,
    title: "The Agent Swarm",
    blurb: "Nine AI specialists orchestrated by a CEO agent, planning and executing daily.",
    status: "shipped",
  },
  {
    icon: BarChart3,
    title: "Living Dashboards",
    blurb: "Tasks, finance, activity and reports — real data, updating as the crew works.",
    status: "shipped",
  },
  {
    icon: BadgeCheck,
    title: "Profiles & Licensing",
    blurb: "Profile ID, account number, affiliate code, and a license that drives your view.",
    status: "shipped",
  },
  {
    icon: LifeBuoy,
    title: "Support Desk",
    blurb: "A ticket queue and admin portal so the support team can help, live.",
    status: "shipped",
  },
  {
    icon: ShieldCheck,
    title: "Topic Exclusivity",
    blurb: "Your topics are yours alone — locked to the owner until you choose to share.",
    status: "shipped",
  },
  {
    icon: Mail,
    title: "Email, Live",
    blurb: "Domain authenticated and sending through SendGrid — real delivery, verified.",
    status: "shipped",
  },
  {
    icon: CreditCard,
    title: "Payments, Armed",
    blurb: "Stripe plans, prices and webhook wired on the live account — one switch from on.",
    status: "armed",
  },
];

function Stamp({ status }: { status: Status }) {
  if (status === "armed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#3a2f12] bg-[#1c160a] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warn">
        <Zap size={12} /> Armed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#1f3d2e] bg-[#0e1c16] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-good">
      <CheckCircle2 size={12} /> Shipped
    </span>
  );
}

function StationCard({ station, index }: { station: Station; index: number }) {
  const Icon = station.icon;
  return (
    <div className="relative w-[248px] shrink-0 rounded-2xl border border-line bg-panel p-5 shadow-[0_20px_60px_-40px_#000]">
      <div className="absolute -top-3 left-5 grid h-6 w-6 place-items-center rounded-md border border-line bg-panel2 text-[11px] font-bold text-dim">
        {index + 1}
      </div>
      <div className="cyt-gradient-bg mb-4 grid h-12 w-12 place-items-center rounded-xl text-bg">
        <Icon size={22} />
      </div>
      <div className="text-[15px] font-bold tracking-[-0.2px] text-ink">
        {station.title}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-mut">{station.blurb}</p>
      <div className="mt-3">
        <Stamp status={station.status} />
      </div>
    </div>
  );
}

/** A conveyor connector between two stations. */
function Conveyor() {
  return (
    <div className="flex shrink-0 items-center px-1" aria-hidden>
      <div className="cyt-conveyor h-[3px] w-10 rounded-full" />
      <ChevronRight size={16} className="-ml-1 text-dim" />
    </div>
  );
}

export default function PreviewPage() {
  const shipped = STATIONS.filter((s) => s.status === "shipped").length;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-28">
      {/* Conveyor + trophy animations. */}
      <style>{`
        .cyt-conveyor{
          background-image:repeating-linear-gradient(90deg,#31384c 0 8px,transparent 8px 16px);
          background-size:16px 100%;
          animation:cyt-flow 700ms linear infinite;
        }
        @keyframes cyt-flow{to{background-position:16px 0}}
        @keyframes cyt-glow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.35)}50%{box-shadow:0 0 44px 6px rgba(99,102,241,.35)}}
        .cyt-trophy{animation:cyt-glow 2.4s ease-in-out infinite}
      `}</style>

      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto mt-14 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1 text-[12px] text-mut">
          <Factory size={13} className="text-brand" /> The build · assembly line
        </div>
        <h1 className="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-[-1px] text-ink">
          From one line to a{" "}
          <span className="cyt-gradient-text">living app</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-mut">
          Every system that makes ChooseYourTopic run, stamped as it comes off the
          line. Follow the belt — it ends in a finished, working product.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-3">
          <span className="text-[26px] font-extrabold text-ink">{shipped}</span>
          <span className="text-left text-[12px] leading-tight text-mut">
            core systems
            <br />
            shipped &amp; live
          </span>
          <span className="mx-1 h-8 w-px bg-line" />
          <span className="text-[26px] font-extrabold text-warn">1</span>
          <span className="text-left text-[12px] leading-tight text-mut">
            armed &amp; ready
            <br />
            (payments)
          </span>
        </div>
      </section>

      {/* The assembly line */}
      <section className="mt-14">
        <div className="flex items-stretch overflow-x-auto pb-6 pt-4">
          <div className="flex items-center gap-0">
            {STATIONS.map((s, i) => (
              <div key={s.title} className="flex items-center">
                <StationCard station={s} index={i} />
                <Conveyor />
              </div>
            ))}

            {/* The finished product. */}
            <div className="cyt-trophy relative w-[280px] shrink-0 rounded-2xl border border-[#31384c] bg-gradient-to-b from-[#141827] to-[#0e1018] p-6 text-center">
              <div className="cyt-gradient-bg mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-bg">
                <Trophy size={30} />
              </div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brand">
                The goal
              </div>
              <div className="mt-1 text-[22px] font-extrabold tracking-[-0.4px] text-ink">
                A successful app
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
                Real users, private topics, an AI crew that ships, and revenue
                ready to switch on.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-1 text-center text-[12px] text-dim">
          Scroll the belt sideways to follow the whole line →
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-md text-center">
        <div className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="text-[18px] font-bold text-ink">Want to run your own line?</h2>
          <p className="mt-1.5 text-[13.5px] text-mut">
            Pick a topic and watch the crew build your business, station by station.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/start"
              className="cyt-gradient-bg inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg"
            >
              How it works <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel2 px-5 py-3 text-[14px] text-mut transition-colors hover:text-ink"
            >
              <Lock size={15} /> Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
