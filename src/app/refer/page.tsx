"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Share2, Copy, Check, Users, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cytapi, ApiError, type MeProfile } from "@/lib/api";

/**
 * Full-screen "show a friend" refer page. Big scannable QR + a native Share
 * button so a user can open their phone, hand it over, and let a friend scan
 * straight into the join flow (their ref is attached).
 */
export default function ReferPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setMe(await cytapi.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const link =
    me?.affiliate?.link ??
    (me?.affiliate_id
      ? `https://chooseyourtopic.com/signin?ref=${me.affiliate_id}`
      : "");
  const count = me?.affiliate?.referral_count ?? 0;

  async function share() {
    // Native share sheet on phones; fall back to copying the link.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on ChooseYourTopic",
          text: "Turn one idea into an AI-run business. Join me:",
          url: link,
        });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-6">
        <Loader2 className="animate-spin text-mut" />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 pb-16">
      <div className="flex items-center justify-between pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} /> Back
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3 py-1 text-[12px] text-mut">
          <Users size={13} className="text-brand" /> {count} joined
        </span>
      </div>

      <section className="mt-8 text-center">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px] text-ink">
          Invite a friend
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-mut">
          Show them this code. When they scan it and join, they&apos;re credited
          to you.
        </p>

        {/* The big, scannable code. */}
        <div className="mx-auto mt-8 w-fit rounded-3xl border border-line bg-white p-6 shadow-[0_20px_60px_-30px_#000]">
          {link ? (
            <QRCodeSVG value={link} size={232} level="M" />
          ) : (
            <div className="grid h-[232px] w-[232px] place-items-center text-[13px] text-[#888]">
              No link yet
            </div>
          )}
        </div>

        <button
          onClick={share}
          className="cyt-gradient-bg mx-auto mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[16px] font-bold text-bg"
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          {copied ? "Link copied" : "Share your link"}
        </button>

        <div className="mx-auto mt-4 flex w-full max-w-xs items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-left font-mono text-[12px] text-mut">
            {link || "—"}
          </span>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {
                /* ignore */
              }
            }}
            className="shrink-0 text-mut transition-colors hover:text-ink"
            aria-label="Copy link"
          >
            {copied ? <Check size={16} className="text-good" /> : <Copy size={16} />}
          </button>
        </div>

        <p className="mt-4 text-[12px] text-dim">
          Affiliate ID{" "}
          <span className="font-mono text-mut">{me?.affiliate_id ?? "—"}</span>
        </p>
      </section>
    </main>
  );
}
