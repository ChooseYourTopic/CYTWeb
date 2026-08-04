"use client";

import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Stripe redirects here if the user backs out of checkout (STRIPE_CANCEL_URL). */
export default function BillingCancelPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />
      <section className="mx-auto mt-20 max-w-md text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-panel2">
          <XCircle size={28} className="text-mut" />
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">Checkout canceled</h1>
        <p className="mt-2 text-[14px] text-mut">
          No charge was made. You can pick a plan whenever you&apos;re ready.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/pricing"
            className="cyt-gradient-bg inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-bold text-bg"
          >
            View plans
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel2 px-5 py-3 text-[14px] text-mut transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} /> Back to topics
          </Link>
        </div>
      </section>
    </main>
  );
}
