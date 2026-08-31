"use client";

import Link from "next/link";
import { ArrowLeft, Plug, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { IntegrationsSearch } from "@/components/integrations/IntegrationsSearch";

/**
 * Integrations — the Empire Bridge tile directory. ChooseYourTopic is a bridge PROVIDER: the
 * Empire platforms listed here CONSUME this owner's topic + customer records one-way, read-only.
 * Each tile opens a View/Setup how-to that issues a scoped read-only bridge key against CYT
 * (reusing the same `cytapi.bridgeKeys` issuance engine as the Settings "API Access" card).
 */
export default function IntegrationsPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />
      <section className="mx-auto mt-12 max-w-[860px]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to your topics
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-[28px] font-bold tracking-[-0.5px]">
          <Plug size={24} className="text-brand" /> Integrations
        </h1>
        <p className="mt-1 text-[14px] text-mut">
          The Empire platforms that connect to ChooseYourTopic. Each pulls your data one-way,
          read-only, over the Empire Integration Bridge — CYT never receives writes.
        </p>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-panel2 px-4 py-3 text-[12.5px] text-mut">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-good" />
          <span>
            You issue each platform its own scoped, revocable key. Keys are read-only this release
            and shown once at issue. Manage every key you&apos;ve issued in{" "}
            <Link href="/settings#api-access" className="font-semibold text-brand hover:underline">
              Settings → API Access
            </Link>
            .
          </span>
        </div>

        <div className="mt-6">
          <IntegrationsSearch />
        </div>
      </section>
    </main>
  );
}
