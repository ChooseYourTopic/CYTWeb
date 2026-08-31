"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Sparkles, ListOrdered } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ConsumerBridgeKeys } from "@/components/integrations/ConsumerBridgeKeys";
import {
  findConsumer,
  setupFor,
  STAGE_LABEL,
  BRIDGE_BASE_URL,
} from "@/lib/integrations-catalog";

/**
 * Integration detail — the View/Setup how-to for one Empire consumer. It explains that the
 * consumer pulls the owner's ChooseYourTopic data one-way (read-only), lists the manual steps,
 * and embeds the CYT bridge-key issuance panel locked to this consumer's slug (reusing
 * `cytapi.bridgeKeys.issue` with `partner=<slug>`, mirroring Lead Interlink's `fixedPartner`).
 */
export default function IntegrationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const consumer = findConsumer(params.slug);

  if (!consumer) {
    return (
      <main className="mx-auto max-w-[1180px] px-6 pb-24">
        <SiteHeader />
        <section className="mx-auto mt-12 max-w-[860px]">
          <Link
            href="/integrations"
            className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} /> Integrations
          </Link>
          <p className="mt-6 text-[13px] text-mut">That integration wasn&apos;t found.</p>
        </section>
      </main>
    );
  }

  const setup = setupFor(consumer);
  const live = consumer.stage === "live";

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />
      <section className="mx-auto mt-12 max-w-[860px]">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Integrations
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">{consumer.name}</h1>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              live ? "border-[#1f3d2e] bg-[#0e1c16] text-good" : "border-line bg-panel2 text-mut"
            }`}
          >
            {STAGE_LABEL[consumer.stage]}
          </span>
          <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
            Data access
          </span>
        </div>
        <p className="mt-1 text-[14px] text-mut">{consumer.blurb}</p>

        {/* What this is */}
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <ArrowRightLeft size={16} className="text-brand" /> What this is
          </div>
          <p className="mt-1.5 text-[13px] text-mut">
            {consumer.name} pulls your ChooseYourTopic topic and customer records{" "}
            <b className="text-ink">one-way, read-only</b>, over the Empire Integration Bridge. It
            presents a scoped key you issue below and reads your records —{" "}
            <b className="text-ink">ChooseYourTopic never receives writes</b>.
            {!live && (
              <>
                {" "}
                You can issue a key today; {consumer.name}&apos;s pull side comes online as it&apos;s
                wired.
              </>
            )}
          </p>
        </div>

        {/* Have your agent do it */}
        <div className="mt-4 rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Sparkles size={16} className="text-brand" /> Have your agent do it
          </div>
          <p className="mt-0.5 text-[12.5px] text-mut">
            Hand this prompt to your command center — done-for-you.
          </p>
          <ul className="mt-3 grid gap-2">
            {setup.prompts.map((p, i) => (
              <li
                key={i}
                className="rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-[13px] text-mut"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* How to set it up */}
        <div className="mt-4 rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <ListOrdered size={16} className="text-brand" /> How to set it up
          </div>
          <ol className="mt-3 space-y-2.5">
            {setup.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] text-mut">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11.5px] text-dim">
            Base URL for {consumer.name}&apos;s bridge console:{" "}
            <code className="font-mono text-mut">{BRIDGE_BASE_URL}</code>
          </p>
        </div>

        {/* Issue & manage the scoped read-only bridge key (locked to this consumer). */}
        <div className="mt-4">
          <ConsumerBridgeKeys partner={consumer.slug} consumerName={consumer.name} />
        </div>
      </section>
    </main>
  );
}
