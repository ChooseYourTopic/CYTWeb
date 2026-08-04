"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Stripe redirects here after a successful checkout (STRIPE_SUCCESS_URL). */
export default function BillingSuccessPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />
      <section className="mx-auto mt-20 max-w-md text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#1f3d2e] bg-[#0e1c16]">
          <CheckCircle2 size={28} className="text-good" />
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">You&apos;re all set</h1>
        <p className="mt-2 text-[14px] text-mut">
          Your subscription is active. Your agents will run on your new plan&apos;s
          allowance starting with the next cycle.
        </p>
        <Link
          href="/dashboard"
          className="cyt-gradient-bg mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-bg"
        >
          Back to your topics <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </section>
    </main>
  );
}
