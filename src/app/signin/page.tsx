"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Mail,
  Eye,
  EyeOff,
  LayoutDashboard,
  LifeBuoy,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi } from "@/lib/api";

/**
 * Country dialing codes for the sign-in selector. Kept short and NANP-first
 * (the primary audience) with common internationals; "+" always yields E.164.
 */
const COUNTRY_CODES: { code: string; label: string; flag: string }[] = [
  { code: "+1", label: "US/Canada", flag: "🇺🇸" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+52", label: "Mexico", flag: "🇲🇽" },
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "+63", label: "Philippines", flag: "🇵🇭" },
];

/**
 * Combine a selected dialing code with the national digits into E.164. If the
 * user typed their own "+…" we trust that verbatim and ignore the selector.
 */
function toE164(dialCode: string, raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return "+" + trimmed.replace(/\D/g, "");
  const national = trimmed.replace(/\D/g, "");
  return dialCode + national;
}
function isValidPhone(e164: string): boolean {
  const d = e164.replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15;
}

/**
 * A "door" an account can enter after signing in. One account can hold several
 * roles at once (a support agent who also runs their own topics; an admin who is
 * all three), so a login can offer more than one destination.
 */
type RoleOption = {
  key: "user" | "support" | "admin";
  label: string;
  desc: string;
  href: string;
  Icon: typeof ShieldCheck;
};

/**
 * Derive the role doors for an account from its /me flags. Every account is a
 * user (their own topics); `is_support` adds the support desk and `is_admin` adds
 * the admin portal. Order: user → support → admin. When only one door exists the
 * caller routes straight there; two or more triggers the chooser.
 */
function rolesFor(me: { is_admin?: boolean; is_support?: boolean }): RoleOption[] {
  const opts: RoleOption[] = [
    {
      key: "user",
      label: "My topics",
      desc: "Your dashboard — run your own AI companies.",
      href: "/dashboard",
      Icon: LayoutDashboard,
    },
  ];
  if (me.is_support) {
    opts.push({
      key: "support",
      label: "Support desk",
      desc: "Work the support queue and help other users.",
      href: "/admin?tab=support",
      Icon: LifeBuoy,
    });
  }
  if (me.is_admin) {
    opts.push({
      key: "admin",
      label: "Admin portal",
      desc: "The full operator console — users, companies, activity.",
      href: "/admin?tab=overview",
      Icon: ShieldCheck,
    });
  }
  return opts;
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
  const [dialCode, setDialCode] = useState("+1");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Email/password path (secondary to phone SMS-OTP).
  const [emailMode, setEmailMode] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  // Multi-role chooser: after login we read the account's roles and, when it holds
  // more than one, prompt which view to enter. A single-role account routes straight.
  const [roleOptions, setRoleOptions] = useState<RoleOption[] | null>(null);

  // After any successful sign-in, read the account's roles. More than one door →
  // show the chooser; exactly one → go straight there. Fail-soft to the dashboard.
  async function afterAuth() {
    try {
      const me = await cytapi.me();
      const options = rolesFor(me);
      if (options.length > 1) {
        setRoleOptions(options);
        setBusy(false);
        return;
      }
      enterRole(options[0]);
    } catch {
      window.location.href = "/dashboard";
    }
  }

  // Enter a chosen role: remember it (so the app can reflect the active view and
  // offer a later "switch role") and navigate to that door.
  function enterRole(opt: RoleOption) {
    try {
      window.localStorage.setItem("cyt_active_role", opt.key);
    } catch {
      /* non-fatal — routing still works without the persisted hint */
    }
    window.location.href = opt.href;
  }

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
      await afterAuth();
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
      await afterAuth();
    } catch {
      setError("Couldn't create the account — that email may already be in use.");
      setBusy(false);
    }
  }

  async function sendCode() {
    const value = toE164(dialCode, phone);
    if (busy) return;
    if (!isValidPhone(value)) {
      setError("Enter a valid mobile number for the selected country.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await cytapi.auth.requestSmsCode(value);
      if (res && res.sent === false) {
        setError("We couldn't send the text right now. Check the number or try again shortly.");
        setBusy(false);
        return;
      }
      setNote("We texted a 6-digit code to your phone.");
      setStep("code");
    } catch {
      setError("We couldn't send the text right now. Please try again shortly.");
    } finally {
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
      await cytapi.auth.verifySmsCode(toE164(dialCode, phone), code);
      setNote("Verified. Signing you in…");
      await afterAuth();
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
          {roleOptions ? (
            <>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel2">
                <ShieldCheck size={20} className="text-brand" />
              </div>
              <h1 className="text-[26px] font-bold tracking-[-0.5px]">
                Welcome back
              </h1>
              <p className="mt-2 text-[14px] text-mut">
                This account has more than one role. Which view are you here for?
              </p>
              <div className="mt-6 space-y-3">
                {roleOptions.map((opt, i) => (
                  <button
                    key={opt.key}
                    onClick={() => enterRole(opt)}
                    className={
                      i === 0
                        ? "flex w-full items-center justify-between rounded-xl border border-line bg-panel2 px-5 py-4 text-left transition-colors hover:border-[#31384c]"
                        : "cyt-gradient-bg flex w-full items-center justify-between rounded-xl px-5 py-4 text-left text-bg"
                    }
                  >
                    <span className="flex items-center gap-3">
                      <opt.Icon
                        size={20}
                        className={i === 0 ? "shrink-0 text-brand" : "shrink-0"}
                      />
                      <span>
                        <span
                          className={`block text-[15px] font-bold ${i === 0 ? "text-ink" : ""}`}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={`block text-[12.5px] ${i === 0 ? "text-mut" : "opacity-80"}`}
                        >
                          {opt.desc}
                        </span>
                      </span>
                    </span>
                    <ArrowRight size={18} className={i === 0 ? "text-mut" : ""} />
                  </button>
                ))}
              </div>
            </>
          ) : emailMode ? (
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
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={registering ? "new-password" : "current-password"}
                  className="w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 pr-12 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
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
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-dim transition-colors hover:text-ink"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
              <div className="mt-2 flex gap-2">
                <select
                  aria-label="Country code"
                  className="rounded-xl border border-line bg-panel2 px-3 py-3.5 text-[15px] text-ink outline-none focus:border-[#31384c]"
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  className="w-full rounded-xl border border-line bg-panel2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendCode();
                  }}
                />
              </div>
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
                <span className="text-ink">{toE164(dialCode, phone)}</span>.
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
