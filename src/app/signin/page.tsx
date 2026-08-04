"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Smartphone, ShieldCheck, Mail } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi } from "@/lib/api";

/** Digits only; require a plausible phone length (7–15 per E.164). */
function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}
function isValidPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  return d.length >= 7 && d.length <= 15;
}

/**
 * Phone-first, SMS-code sign-in. Two steps:
 *   1) enter mobile number → POST /auth/sms/request → code texted
 *   2) enter the 6-digit code → POST /auth/sms/verify → session
 * Fail-soft: if the backend auth isn't live yet, the flow still advances so it
 * can be reviewed end-to-end against the live UI.
 */
export default function SignInPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Email/password path (secondary to phone SMS-OTP).
  const [emailMode, setEmailMode] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  async function passwordSignIn() {
    if (busy) return;
    if (!identifier.trim() || !password) {
      setError("Enter your email or nickname and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cytapi.auth.passwordLogin(identifier.trim(), password);
      window.location.href = "/dashboard";
    } catch {
      setError("Wrong email/nickname or password.");
      setBusy(false);
    }
  }

  async function registerAccount() {
    if (busy) return;
    if (!identifier.trim() || password.length < 8) {
      setError("Enter an email and a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cytapi.auth.register({
        email: identifier.trim(),
        password,
        nickname: nickname.trim() || undefined,
      });
      window.location.href = "/dashboard";
    } catch {
      setError("Couldn't create the account — that email may already be in use.");
      setBusy(false);
    }
  }

  async function sendCode() {
    const value = normalizePhone(phone);
    if (busy) return;
    if (!isValidPhone(value)) {
      setError("Enter a valid mobile number (include country code).");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await cytapi.auth.requestSmsCode(value);
      setNote("We texted a 6-digit code to your phone.");
    } catch {
      setNote("Auth backend isn't live yet — enter any 6 digits to preview.");
    } finally {
      setStep("code");
      setBusy(false);
    }
  }

  async function verify() {
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cytapi.auth.verifySmsCode(normalizePhone(phone), code);
      setNote("Verified. Signing you in…");
      // The session cookie is set here; land the user on their own dashboard.
      window.location.href = "/dashboard";
    } catch {
      setError("Couldn't verify — the auth backend isn't live yet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6">
      <SiteHeader />

      <section className="mx-auto mt-16 max-w-md">
        <div className="rounded-2xl border border-line bg-panel p-8 shadow-[0_20px_60px_-30px_#000]">
          {emailMode ? (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel2">
                <Mail size={20} className="text-brand" />
              </div>
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">
                {registering ? "Create account" : "Log in with email"}
              </h1>
              <p className="mt-2 text-[14px] text-mut">
                {registering
                  ? "Register with an email and a password."
                  : "Use your email or nickname and password."}
              </p>

              <label className="mt-6 block text-[12px] uppercase tracking-wider text-dim">
                {registering ? "Email" : "Email or nickname"}
              </label>
              <input
                type={registering ? "email" : "text"}
                autoComplete={registering ? "email" : "username"}
                className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                placeholder={registering ? "you@example.com" : "you@example.com or nickname"}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
              />

              {registering && (
                <>
                  <label className="mt-4 block text-[12px] uppercase tracking-wider text-dim">
                    Nickname (optional)
                  </label>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                    placeholder="a name to go by"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </>
              )}

              <label className="mt-4 block text-[12px] uppercase tracking-wider text-dim">
                Password
              </label>
              <input
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    registering ? registerAccount() : passwordSignIn();
                }}
              />
              {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}

              <button
                onClick={registering ? registerAccount : passwordSignIn}
                disabled={busy}
                className="cyt-gradient-bg mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? "Working…" : registering ? "Create account" : "Log in"}
                {!busy && <ArrowRight size={16} strokeWidth={2.5} />}
              </button>

              <div className="mt-4 flex items-center justify-between text-[13px]">
                <button
                  onClick={() => {
                    setEmailMode(false);
                    setError(null);
                  }}
                  className="text-mut transition-colors hover:text-ink"
                >
                  ← Use phone instead
                </button>
                <button
                  onClick={() => {
                    setRegistering((r) => !r);
                    setError(null);
                  }}
                  className="text-brand hover:underline"
                >
                  {registering ? "Have an account? Log in" : "Create an account"}
                </button>
              </div>
            </>
          ) : step === "phone" ? (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel2">
                <Smartphone size={20} className="text-brand" />
              </div>
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">Sign in</h1>
              <p className="mt-2 text-[14px] text-mut">
                Enter your mobile number and we&apos;ll text you a one-time code.
                No password to remember.
              </p>

              <label
                htmlFor="phone"
                className="mt-6 block text-[12px] uppercase tracking-wider text-dim"
              >
                Mobile number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendCode();
                }}
              />
              {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}

              <button
                onClick={sendCode}
                disabled={busy}
                className="cyt-gradient-bg mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? "Sending…" : "Text me a code"}
                {!busy && <ArrowRight size={16} strokeWidth={2.5} />}
              </button>

              <p className="mt-4 text-center text-[12.5px] text-dim">
                New here? The same code creates your account. Message &amp; data
                rates may apply.
              </p>
              <p className="mt-3 text-center text-[12.5px] text-dim">
                or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(true);
                    setError(null);
                  }}
                  className="text-brand hover:underline"
                >
                  log in with email
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel2">
                <ShieldCheck size={20} className="text-good" />
              </div>
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">
                Enter your code
              </h1>
              <p className="mt-2 text-[14px] text-mut">
                {note ?? "We texted a 6-digit code to"}{" "}
                <span className="text-ink">{phone}</span>.
              </p>

              <label
                htmlFor="code"
                className="mt-6 block text-[12px] uppercase tracking-wider text-dim"
              >
                6-digit code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                className="mt-2 w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-center text-[24px] font-semibold tracking-[0.5em] text-ink outline-none placeholder:tracking-normal placeholder:text-dim focus:border-[#31384c]"
                placeholder="••••••"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") verify();
                }}
              />
              {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}

              <button
                onClick={verify}
                disabled={busy}
                className="cyt-gradient-bg mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify & sign in"}
                {!busy && <ArrowRight size={16} strokeWidth={2.5} />}
              </button>

              <div className="mt-4 flex items-center justify-between text-[13px]">
                <button
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError(null);
                    setNote(null);
                  }}
                  className="text-mut transition-colors hover:text-ink"
                >
                  ← Change number
                </button>
                <button
                  onClick={sendCode}
                  disabled={busy}
                  className="text-brand hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mx-auto mt-5 max-w-md text-center text-[12px] text-dim">
          By continuing you agree to the ChooseYourTopic Terms and Privacy
          Policy, and to receive a verification text.
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
