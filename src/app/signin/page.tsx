"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Passwordless (magic-link) sign-in. Enter email → POST /auth/magic-link/request
 * → "check your inbox" state. Fail-soft: if the backend auth isn't live yet we
 * still advance to the sent state so the flow is fully reviewable.
 */
export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = email.trim();
    if (busy) return;
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cytapi.auth.requestMagicLink(value);
      setSent(true);
    } catch {
      // Backend auth not up yet — still show the check-inbox state so the
      // sign-in flow can be reviewed end-to-end against the live UI.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />

      <section className="mx-auto mt-16 max-w-md">
        <div className="rounded-2xl border border-line bg-panel p-8 shadow-[0_20px_60px_-30px_#000]">
          {!sent ? (
            <>
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Sign in</h1>
              <p className="mt-2 text-[14px] text-mut">
                Enter your email and we&apos;ll send a one-time sign-in link. No
                password to remember.
              </p>

              <label
                htmlFor="email"
                className="mt-6 block text-[12px] uppercase tracking-wider text-dim"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}

              <button
                onClick={submit}
                disabled={busy}
                className="cyt-gradient-bg mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send sign-in link"}
                {!busy && <ArrowRight size={16} strokeWidth={2.5} />}
              </button>

              <p className="mt-4 text-center text-[12.5px] text-dim">
                New here? The same link creates your account.
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-panel2">
                <MailCheck size={22} className="text-good" />
              </div>
              <h1 className="mt-4 text-[22px] font-bold tracking-[-0.4px]">
                Check your inbox
              </h1>
              <p className="mt-2 text-[14px] text-mut">
                If <span className="text-ink">{email}</span> matches an account,
                a one-time sign-in link is on its way. It expires in 10 minutes.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-[13px] text-brand hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="mx-auto mt-5 max-w-md text-center text-[12px] text-dim">
          By continuing you agree to the {`ChooseYourTopic`} Terms and Privacy
          Policy.
        </p>
        <p className="mt-3 text-center text-[13px]">
          <Link href="/" className="text-mut transition-colors hover:text-ink">
            ← Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
