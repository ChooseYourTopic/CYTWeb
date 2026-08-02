import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Pricing / plans. Indicative beta pricing — subscription tiers + task credits,
 * plus the aligned platform fee (we win when the company you start wins).
 * CTAs route to /signin. Backend billing (Stripe) lands later; this is the surface.
 */
type Tier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  featured?: boolean;
  cta: string;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Explorer",
    price: "$29",
    cadence: "/mo",
    blurb: "Start one topic and watch it build itself.",
    cta: "Start with Explorer",
    features: [
      "1 company",
      "1 autonomous cycle every night",
      "20 task credits / month",
      "Living research dashboard",
      "Email & SMS support",
    ],
  },
  {
    name: "Builder",
    price: "$49",
    cadence: "/mo",
    blurb: "For founders running a topic in earnest.",
    featured: true,
    cta: "Start with Builder",
    features: [
      "Up to 3 companies",
      "Nightly cycles + on-demand runs",
      "60 task credits / month",
      "Priority agent queue",
      "Competitor & market deep-dives",
    ],
  },
  {
    name: "Scale",
    price: "$59",
    cadence: "/mo",
    blurb: "Run a portfolio of topics at full tilt.",
    cta: "Start with Scale",
    features: [
      "Up to 10 companies",
      "Highest-frequency cycles",
      "150 task credits / month",
      "Fastest model routing",
      "Advanced integrations & exports",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />

      <section className="pb-4 pt-14 text-center">
        <h1 className="mx-auto text-[42px] font-bold leading-[1.05] tracking-[-1px]">
          Start small. <span className="cyt-gradient-text">Scale as it works.</span>
        </h1>
        <p className="mx-auto my-4 max-w-[620px] text-[17px] text-mut">
          Pick a plan, give it a topic, and the agent team runs your company in
          the background. Every plan includes the full living dashboard.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 pb-6 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={
              "relative flex flex-col rounded-2xl border bg-panel p-6 " +
              (t.featured
                ? "border-brand shadow-[0_24px_70px_-30px_#6ea8fe66]"
                : "border-line")
            }
          >
            {t.featured && (
              <span className="cyt-gradient-bg absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-bg">
                Most popular
              </span>
            )}
            <h2 className="text-[15px] font-semibold uppercase tracking-wider text-mut">
              {t.name}
            </h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[38px] font-bold tracking-[-1px]">
                {t.price}
              </span>
              <span className="text-[14px] text-dim">{t.cadence}</span>
            </div>
            <p className="mt-2 text-[13.5px] text-mut">{t.blurb}</p>

            <ul className="mt-5 flex flex-1 flex-col gap-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]">
                  <Check
                    size={16}
                    strokeWidth={2.5}
                    className="mt-0.5 flex-none text-good"
                  />
                  <span className="text-ink">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signin"
              className={
                "mt-6 rounded-xl px-6 py-3 text-center text-[15px] font-bold " +
                (t.featured
                  ? "cyt-gradient-bg text-bg"
                  : "border border-line bg-panel2 text-ink transition-colors hover:border-[#31384c]")
              }
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[720px] rounded-2xl border border-line bg-panel2 p-6 text-center">
        <h3 className="text-[15px] font-semibold text-ink">
          Aligned pricing — we win when you win
        </h3>
        <p className="mx-auto mt-2 max-w-[600px] text-[13.5px] text-mut">
          Beyond the subscription, ChooseYourTopic takes a small platform fee
          (~20%) on ad spend it manages and on revenue it helps your company
          earn. Task credits fuel extra on-demand agent runs; every plan caps
          spend so costs never surprise you.
        </p>
      </section>

      <p className="my-9 text-center text-[12px] text-dim">
        Indicative beta pricing — final plans confirmed at launch. All prices USD.
      </p>
    </main>
  );
}
