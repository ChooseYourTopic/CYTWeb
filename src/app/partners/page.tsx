"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake,
  Copy,
  Check,
  Loader2,
  Link2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi, ApiError, type PartnersOverview } from "@/lib/api";

/**
 * Partners — a standalone platform surface (D8): one-click affiliate registration
 * that mints a join link for the professional-services catalog, plus the attributions
 * credited to the affiliate-of-record (D9). Engineering owns the mechanism only; the
 * affiliate program strategy is the marketing team's (D10a). Money shown in whole USD.
 */

function money(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export default function PartnersPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<PartnersOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await cytapi.partners());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't load your Partners overview. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function register() {
    if (registering) return;
    setRegistering(true);
    setError(null);
    try {
      await cytapi.registerPartner();
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't register. Please try again.");
    } finally {
      setRegistering(false);
    }
  }

  const registration = overview?.registration ?? null;
  const link = registration?.link ?? "";

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />

      <section className="mx-auto mt-10 max-w-[860px]">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-tight text-ink">
            <Handshake size={22} className="text-brand" /> Partners
          </h1>
          <p className="mt-1 text-[13.5px] text-mut">
            Register once to mint your affiliate link for the professional-services
            catalog. Referred subscriptions are attributed here — the funding
            mechanism that keeps the project growing.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-[#4a1f1f] bg-[#1c0e0e] px-4 py-3 text-[12.5px] text-bad">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-mut">
            <Loader2 size={16} className="animate-spin" /> Loading your Partners
            overview…
          </div>
        ) : !registration ? (
          /* Not registered yet — one-click registration. */
          <div className="rounded-2xl border border-dashed border-line bg-panel/50 py-14 text-center">
            <Sparkles size={28} className="mx-auto text-dim" />
            <p className="mt-3 text-[15px] text-ink">You&apos;re not registered yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-mut">
              Registration is one click — it mints your affiliate link and starts
              tracking attributions.
            </p>
            <button
              type="button"
              onClick={register}
              disabled={registering}
              className="cyt-gradient-bg mx-auto mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {registering ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Handshake size={16} />
              )}
              {registering ? "Registering…" : "Register as a partner"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* The affiliate link */}
            <div className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider text-dim">
                <Link2 size={13} /> Your affiliate link
              </div>
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-mut">
                  {link}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 text-mut transition-colors hover:text-ink"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check size={16} className="text-good" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
              <p className="mt-2 text-[12px] text-dim">
                Code{" "}
                <span className="font-mono text-mut">
                  {registration.affiliate_code}
                </span>{" "}
                · <span className="capitalize">{registration.status}</span>
              </p>
            </div>

            {/* Rollup */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
                  <TrendingUp size={13} /> Attributions
                </div>
                <div className="mt-1 text-[22px] font-bold text-ink">
                  {overview?.rollup.count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
                  <Sparkles size={13} /> Recorded
                </div>
                <div className="mt-1 text-[22px] font-bold text-good">
                  {money(overview?.rollup.recorded_cents ?? 0)}
                </div>
              </div>
            </div>

            {/* Attribution ledger */}
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="border-b border-line bg-panel2 px-4 py-2.5 text-[12px] uppercase tracking-wider text-dim">
                Referred subscriptions
              </div>
              {(overview?.attributions.length ?? 0) === 0 ? (
                <p className="px-4 py-6 text-[13px] text-mut">
                  No attributions yet — referred subscriptions from your link land
                  here.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {overview?.attributions.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-ink">
                          {a.service_key}
                        </div>
                        <div className="text-[11.5px] capitalize text-dim">
                          {a.provider ?? "—"} · {a.status}
                        </div>
                      </div>
                      <span className="flex-none text-[13px] font-semibold text-ink">
                        {a.amount_cents != null ? money(a.amount_cents) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
