"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  KeyRound,
  Smartphone,
} from "lucide-react";
import { cytapi, ApiError, type TwoFactorStatus } from "@/lib/api";

/* ------------------------------- primitives ------------------------------- */

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-mut transition-colors hover:text-ink"
    >
      {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function CodeInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      className="cyt-input text-center font-mono text-[18px] tracking-[0.4em]"
      placeholder="000000"
      maxLength={9}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
      }}
    />
  );
}

/* ------------------------------- enroll flow ------------------------------ */

/**
 * Set up an authenticator app: enroll (secret + QR) → confirm a code → one-time
 * recovery codes → done. Used both from Settings and from the admin enrollment
 * step-up.
 */
export function EnrollFlow({ onDone }: { onDone: () => void }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const begin = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await cytapi.twoFactor.enroll();
      setSecret(r.secret);
      setUri(r.otpauth_uri);
    } catch {
      setErr("Couldn't start enrollment. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    begin();
  }, [begin]);

  async function confirm() {
    if (busy || code.trim().length < 6) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await cytapi.twoFactor.confirm(code.trim());
      setRecovery(r.recovery_codes);
    } catch (e) {
      setErr(
        e instanceof ApiError && e.status === 422
          ? "That code didn't match — enter the current 6-digit code."
          : "Couldn't confirm. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Recovery codes shown once — the last step before done.
  if (recovery) {
    return (
      <div>
        <div className="flex items-center gap-2 text-[14px] font-semibold text-good">
          <ShieldCheck size={16} /> Two-factor is on
        </div>
        <p className="mt-2 text-[13px] text-mut">
          Save these recovery codes somewhere safe. Each works once if you lose
          your authenticator — this is the only time they&apos;re shown.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-panel2 p-3 font-mono text-[13px] text-ink">
          {recovery.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <CopyButton value={recovery.join("\n")} label="Copy codes" />
          <button
            onClick={onDone}
            className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg"
          >
            I&apos;ve saved them
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {busy && !uri ? (
        <div className="flex items-center gap-2 py-4 text-[13px] text-mut">
          <Loader2 size={15} className="animate-spin" /> Preparing your secret…
        </div>
      ) : uri && secret ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-line bg-white p-3">
              <QRCodeSVG value={uri} size={168} level="M" />
            </div>
            <span className="flex items-center gap-1 text-[11px] text-dim">
              <Smartphone size={12} /> Scan in your authenticator app
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-mut">
              Scan the QR with Google Authenticator, 1Password, Authy, or similar.
              Can&apos;t scan? Enter this key by hand:
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="cyt-input font-mono text-[12px]"
                value={secret}
                readOnly
              />
              <CopyButton value={secret} />
            </div>
            <div className="mt-4">
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                Enter the 6-digit code to turn it on
              </span>
              <div className="flex gap-2">
                <CodeInput
                  value={code}
                  onChange={setCode}
                  onSubmit={confirm}
                  disabled={busy}
                />
                <button
                  onClick={confirm}
                  disabled={busy || code.trim().length < 6}
                  className="cyt-gradient-bg flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                  Verify & enable
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={begin}
          className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg"
        >
          Start setup
        </button>
      )}
      {err && <p className="mt-3 text-[13px] text-bad">{err}</p>}
    </div>
  );
}

/* ------------------------------- verify form ------------------------------ */

/** Prove the second factor for this session (admin step-up). */
export function VerifyForm({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (busy || code.trim().length < 6) return;
    setBusy(true);
    setErr(null);
    try {
      await cytapi.twoFactor.verify(code.trim());
      onVerified();
    } catch (e) {
      setErr(
        e instanceof ApiError && e.status === 422
          ? "That code didn't match. Use the current code, or a recovery code."
          : "Couldn't verify. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
        Authenticator code
      </span>
      <div className="flex gap-2">
        <CodeInput value={code} onChange={setCode} onSubmit={submit} disabled={busy} />
        <button
          onClick={submit}
          disabled={busy || code.trim().length < 6}
          className="cyt-gradient-bg flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Verify
        </button>
      </div>
      <p className="mt-2 text-[12px] text-dim">
        Enter the 6-digit code from your authenticator, or one of your recovery
        codes.
      </p>
      {err && <p className="mt-3 text-[13px] text-bad">{err}</p>}
    </div>
  );
}

/* --------------------------- settings management -------------------------- */

/** Full lifecycle 2FA card for the Settings page: status → enroll / disable. */
export function TwoFactorCard() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [disarm, setDisarm] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await cytapi.twoFactor.status());
    } catch {
      /* fail soft */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function disable() {
    if (busy || code.trim().length < 6) return;
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.twoFactor.disable(code.trim());
      setDisarm(false);
      setCode("");
      setMsg({ ok: true, text: "Two-factor turned off." });
      await load();
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 422
            ? "That code didn't match — enter a current or recovery code."
            : "Couldn't turn it off. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const enabled = status?.enabled ?? false;

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <ShieldCheck size={16} className="text-brand" /> Two-factor authentication
      </div>
      <p className="mt-1 text-[13px] text-mut">
        An authenticator-app code on top of your login. Required for the admin
        portal — set it up here before it&apos;s enforced.
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-mut">
            <Loader2 size={15} className="animate-spin" /> Checking status…
          </div>
        ) : enabled ? (
          <div>
            <div className="flex items-center gap-2 rounded-xl border border-[#1f3d2e] bg-[#0e1c16] px-3 py-2 text-[13px] text-good">
              <ShieldCheck size={14} /> On ·{" "}
              {status?.recovery_codes_remaining ?? 0} recovery codes left
            </div>
            {disarm ? (
              <div className="mt-3">
                <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                  Enter a code to turn it off
                </span>
                <div className="flex gap-2">
                  <CodeInput
                    value={code}
                    onChange={setCode}
                    onSubmit={disable}
                    disabled={busy}
                  />
                  <button
                    onClick={disable}
                    disabled={busy || code.trim().length < 6}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-[#3d1f1f] bg-[#1c0e0e] px-4 py-2 text-[14px] font-bold text-bad disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                    Turn off
                  </button>
                </div>
                <button
                  onClick={() => {
                    setDisarm(false);
                    setCode("");
                  }}
                  className="mt-2 text-[12px] text-dim hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDisarm(true)}
                className="mt-3 flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-1.5 text-[13px] font-semibold text-mut transition-colors hover:text-bad"
              >
                <ShieldAlert size={14} /> Turn off two-factor
              </button>
            )}
          </div>
        ) : enrolling ? (
          <EnrollFlow
            onDone={() => {
              setEnrolling(false);
              setMsg({ ok: true, text: "Two-factor is on." });
              load();
            }}
          />
        ) : (
          <button
            onClick={() => setEnrolling(true)}
            className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg"
          >
            <KeyRound size={15} /> Set up two-factor
          </button>
        )}
      </div>

      {msg && (
        <p className={`mt-3 text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

/* ------------------------------- admin gate ------------------------------- */

/**
 * The admin step-up screen. When admin routes demand two-factor, this stands in
 * front of the portal: enroll an authenticator (first time) or verify a code
 * (this session), then clears back to the portal.
 */
export function AdminTwoFactorChallenge({
  kind,
  onCleared,
}: {
  kind: "enroll" | "verify";
  onCleared: () => void;
}) {
  return (
    <div className="mx-auto mt-16 max-w-[560px] rounded-2xl border border-line bg-panel p-6">
      <div className="flex items-center gap-2 text-[18px] font-bold text-ink">
        <ShieldAlert size={20} className="text-brand" />
        {kind === "enroll" ? "Set up two-factor to continue" : "Verify to continue"}
      </div>
      <p className="mt-1.5 text-[13.5px] text-mut">
        {kind === "enroll"
          ? "The admin portal requires an authenticator app. Set one up now — it takes about a minute."
          : "For your security, confirm a code from your authenticator app to open the admin portal."}
      </p>
      <div className="mt-5">
        {kind === "enroll" ? (
          <EnrollFlow onDone={onCleared} />
        ) : (
          <VerifyForm onVerified={onCleared} />
        )}
      </div>
    </div>
  );
}
