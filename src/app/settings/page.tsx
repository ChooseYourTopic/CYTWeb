"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User as UserIcon,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Link2,
  Sparkles,
  Share2,
  Copy,
  Check,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  cytapi,
  ApiError,
  type MeProfile,
  type AiCredential,
  type ViewMode,
} from "@/lib/api";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

type AiMode = "default" | "api_key" | "oauth";

function Card({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Icon size={16} className="text-brand" /> {title}
      </div>
      <p className="mt-1 text-[13px] text-mut">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeProfile | null>(null);
  const [cred, setCred] = useState<AiCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profile, credential] = await Promise.all([
        cytapi.me(),
        cytapi.aiCredential.get(),
      ]);
      setMe(profile);
      setCred(credential);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't load your settings.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1180px] px-6 pb-24">
        <SiteHeader />
        <div className="mx-auto mt-16 flex max-w-[640px] items-center gap-2 text-mut">
          <Loader2 size={16} className="animate-spin" /> Loading your settings…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-24">
      <SiteHeader />
      <section className="mx-auto mt-12 max-w-[640px]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to your topics
        </Link>
        <h1 className="mt-4 text-[28px] font-bold tracking-[-0.5px]">Settings</h1>
        <p className="mt-1 text-[14px] text-mut">
          Your profile, engine preferences, and how your agents are powered.
        </p>

        {me?.profile_id && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-line bg-panel2 px-4 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-dim">
                Profile ID
              </div>
              <div className="font-mono text-[17px] font-semibold text-ink">
                {me.profile_id}
              </div>
            </div>
            <div className="text-right text-[11.5px] leading-tight text-dim">
              Everything about your account is
              <br />
              organized under this profile ID.
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}

        <div className="mt-6 grid gap-4">
          {me && <ProfileCard me={me} />}
          {me && <AffiliateCard me={me} />}
          {me && <PasswordCard me={me} />}
          {me && <PreferencesCard me={me} />}
          {cred && <AiAccountCard cred={cred} onChange={setCred} />}
        </div>
      </section>
    </main>
  );
}

/* ------------------------------- Profile ---------------------------------- */

function ProfileCard({ me }: { me: MeProfile }) {
  // Ignore a legacy masked-phone name so it reads as "unset".
  const initialName = me.name && !me.name.includes("*") ? me.name : "";
  const [name, setName] = useState(initialName);
  const [nickname, setNickname] = useState(me.nickname ?? "");
  const [showNickname, setShowNickname] = useState(me.show_nickname);
  const [email, setEmail] = useState(me.email ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    name !== initialName ||
    nickname !== (me.nickname ?? "") ||
    showNickname !== me.show_nickname ||
    email !== (me.email ?? "");

  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.updateProfile({
        name: name.trim() || null,
        nickname: nickname.trim() || null,
        show_nickname: showNickname,
        email: email.trim() || null,
      });
      setMsg({ ok: true, text: "Saved." });
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 422
            ? "That email is already in use, or looks invalid."
            : "Couldn't save. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      icon={UserIcon}
      title="Profile"
      desc="Your account name (shown on your dashboard instead of your phone) and contact email."
    >
      <div className="grid gap-3">
        <Field label="Account name — shown on your dashboard">
          <input
            className="cyt-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tracy, or Kuykendall Empire"
          />
        </Field>
        <Field label="Nickname">
          <input
            className="cyt-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Optional — a shorter name to go by"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 py-0.5">
          <input
            type="checkbox"
            checked={showNickname}
            onChange={(e) => setShowNickname(e.target.checked)}
            className="h-4 w-4 accent-[#6366f1]"
          />
          <span className="text-[13px] text-mut">
            Show my nickname in place of my account name
          </span>
        </label>
        <Field label="Email">
          <input
            type="email"
            className="cyt-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Phone">
          <input
            className="cyt-input opacity-60"
            value={me.phone ?? "—"}
            readOnly
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account number">
            <input
              className="cyt-input font-mono opacity-60"
              value={me.account_number ?? "—"}
              readOnly
            />
          </Field>
          <Field label="License">
            <input
              className="cyt-input opacity-60"
              value={
                me.license
                  ? `${me.license.label ?? me.license.type}${me.license.id ? ` · ${me.license.id}` : ""}${me.license.status !== "active" ? ` (${me.license.status})` : ""}`
                  : "—"
              }
              readOnly
            />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Save profile
        </button>
        {msg && (
          <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------- Affiliate -------------------------------- */

function AffiliateCard({ me }: { me: MeProfile }) {
  const link =
    me.affiliate?.link ??
    (me.affiliate_id
      ? `https://chooseyourtopic.com/?ref=${me.affiliate_id}`
      : "");
  const count = me.affiliate?.referral_count ?? 0;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card
      icon={Share2}
      title="Refer & grow"
      desc="Share your link or QR code. Anyone who joins through it is credited to you."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2">
            <Users size={16} className="text-brand" />
            <span className="text-[20px] font-bold text-ink">{count}</span>
            <span className="text-[12px] text-mut">
              {count === 1 ? "person introduced" : "people introduced"}
            </span>
          </div>

          <Field label="Your affiliate link">
            <div className="flex gap-2">
              <input className="cyt-input font-mono text-[12px]" value={link} readOnly />
              <button
                onClick={copy}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-mut transition-colors hover:text-ink"
              >
                {copied ? (
                  <Check size={14} className="text-good" />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </Field>
          <p className="mt-2 text-[12px] text-dim">
            Affiliate ID{" "}
            <span className="font-mono text-mut">{me.affiliate_id ?? "—"}</span>
          </p>
        </div>

        {link && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-line bg-white p-3">
              <QRCodeSVG value={link} size={120} level="M" />
            </div>
            <span className="text-[11px] text-dim">Scan to join</span>
          </div>
        )}
      </div>
      <Link
        href="/refer"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
      >
        <Share2 size={14} /> Open the share screen to show a friend
      </Link>
    </Card>
  );
}

/* ------------------------------- Password --------------------------------- */

function PasswordCard({ me }: { me: MeProfile }) {
  const hasPassword = me.has_password ?? false;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (busy) return;
    if (next.length < 8) {
      setMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: "The passwords don't match." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.updatePassword({
        ...(hasPassword ? { current_password: current } : {}),
        password: next,
        password_confirmation: confirm,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg({
        ok: true,
        text: hasPassword
          ? "Password changed."
          : "Password set — you can now log in with your email and password.",
      });
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 422
            ? "Check your current password and try again."
            : "Couldn't save. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      icon={KeyRound}
      title="Password"
      desc={
        hasPassword
          ? "Change the password you use to log in with your email or nickname."
          : "Set a password so you can log in with your email or nickname — your phone code still works too."
      }
    >
      <div className="grid gap-3">
        {hasPassword && (
          <Field label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              className="cyt-input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        )}
        <Field label={hasPassword ? "New password" : "Password"}>
          <input
            type="password"
            autoComplete="new-password"
            className="cyt-input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            autoComplete="new-password"
            className="cyt-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            placeholder="Re-enter your password"
          />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !next || !confirm || (hasPassword && !current)}
          className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          {hasPassword ? "Change password" : "Set password"}
        </button>
        {msg && (
          <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ----------------------------- Preferences -------------------------------- */

function PreferencesCard({ me }: { me: MeProfile }) {
  const prefs = me.preferences;
  const platformCap = prefs?.platform_daily_budget_usd ?? 25;
  const [tz, setTz] = useState(prefs?.timezone ?? "");
  const [budget, setBudget] = useState(
    prefs?.daily_budget_usd != null ? String(prefs.daily_budget_usd) : "",
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    prefs?.view_mode ?? "standard",
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // The license dictates the view: Expert is unlocked only by an expert/staff license.
  const canExpert = me.security?.entitlements?.features?.expert_view ?? true;

  const tzOptions = tz && !TIMEZONES.includes(tz) ? [tz, ...TIMEZONES] : TIMEZONES;

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const trimmed = budget.trim();
    try {
      await cytapi.updatePreferences({
        timezone: tz || null,
        daily_budget_usd: trimmed === "" ? null : Number(trimmed),
        view_mode: viewMode,
      });
      setMsg({ ok: true, text: "Saved." });
    } catch {
      setMsg({ ok: false, text: "Couldn't save. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      icon={SlidersHorizontal}
      title="Preferences"
      desc="Applied to the topics you start."
    >
      <div className="grid gap-3">
        <Field label="Timezone — sets when your daily agent cycles run">
          <select
            className="cyt-input"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
          >
            <option value="">Default (UTC)</option>
            {tzOptions.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Daily spend cap (USD) — per company, per day">
          <input
            type="number"
            min={0}
            step="0.5"
            className="cyt-input"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder={`Default (${platformCap})`}
          />
        </Field>
        <Field label="Dashboard view — how many tabs each topic shows">
          <div className="flex gap-1 rounded-xl border border-line bg-panel2 p-1">
            {(
              [
                { key: "basic", label: "Basic", hint: "Essentials" },
                { key: "standard", label: "Standard", hint: "Core tabs" },
                {
                  key: "advanced",
                  label: "Expert",
                  hint: canExpert ? "Every tab" : "Expert license",
                },
              ] as { key: ViewMode; label: string; hint: string }[]
            ).map((o) => {
              const locked = o.key === "advanced" && !canExpert;
              return (
                <button
                  key={o.key}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setViewMode(o.key)}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    viewMode === o.key
                      ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
                      : "text-mut hover:text-ink"
                  } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {o.label}
                  <span className="text-[11px] font-normal text-dim">{o.hint}</span>
                </button>
              );
            })}
          </div>
          {!canExpert && (
            <p className="mt-1.5 text-[12px] text-dim">
              The Expert view (every tab) is unlocked with an Expert license.
            </p>
          )}
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Save preferences
        </button>
        {msg && (
          <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------ AI account -------------------------------- */

function AiAccountCard({
  cred,
  onChange,
}: {
  cred: AiCredential;
  onChange: (c: AiCredential) => void;
}) {
  const current: AiMode = cred.connected
    ? (cred.auth_type as AiMode)
    : "default";
  const [mode, setMode] = useState<AiMode>(current);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const needsReauth = cred.status === "needs_reauth";

  async function useDefault() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (cred.connected) await cytapi.aiCredential.disconnect();
      onChange(await cytapi.aiCredential.get());
      setMsg({ ok: true, text: "Using the house account (preview mode)." });
    } catch {
      setMsg({ ok: false, text: "Couldn't switch. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function saveKey() {
    const key = apiKey.trim();
    if (!key || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      onChange(await cytapi.aiCredential.saveApiKey(key));
      setApiKey("");
      setMsg({ ok: true, text: "Connected — your agents run on your account." });
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 422
            ? "That doesn't look like a valid key."
            : "Couldn't save that key.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function connectOauth() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const { authorize_url } = await cytapi.aiCredential.oauthStart();
      window.location.href = authorize_url;
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 501
            ? "Account connect isn't available yet — use an API key."
            : "Couldn't start the connection.",
      });
      setBusy(false);
    }
  }

  async function test() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await cytapi.aiCredential.validate();
      onChange(await cytapi.aiCredential.get());
      setMsg({ ok: true, text: r.message });
    } catch (e) {
      await cytapi.aiCredential
        .get()
        .then(onChange)
        .catch(() => {});
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 422
            ? "Anthropic rejected this key — replace it and test again."
            : "Couldn't reach Anthropic to test the key.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disconnectCred() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.aiCredential.disconnect();
      onChange(await cytapi.aiCredential.get());
      setMode("default");
      setMsg({ ok: true, text: "Disconnected — back on the house account." });
    } catch {
      setMsg({ ok: false, text: "Couldn't disconnect. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const SEGMENTS: { key: AiMode; label: string; Icon: typeof KeyRound }[] = [
    { key: "default", label: "Default", Icon: Sparkles },
    { key: "api_key", label: "API key", Icon: KeyRound },
    { key: "oauth", label: "OAuth", Icon: Link2 },
  ];

  return (
    <Card
      icon={ShieldCheck}
      title="AI account"
      desc="How your agents are powered. Switch between the house account, your own API key, or a connected account."
    >
      {/* Current status */}
      <div
        className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] ${
          needsReauth
            ? "border-[#3a2f12] bg-[#1c160a] text-warn"
            : cred.connected
              ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
              : "border-line bg-panel2 text-mut"
        }`}
      >
        {needsReauth ? (
          <AlertTriangle size={14} />
        ) : cred.connected ? (
          <ShieldCheck size={14} />
        ) : (
          <Sparkles size={14} />
        )}
        {needsReauth
          ? "Your connection expired — reconnect to keep running on your account."
          : cred.connected
            ? `On your ${cred.auth_type === "oauth" ? "connected account" : "API key"}${
                cred.account_label ? ` · ${cred.account_label}` : ""
              }`
            : "On the house account — preview mode, billed to us."}
      </div>

      {/* Connected: test + disconnect + last-checked. */}
      {cred.connected && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {cred.auth_type === "api_key" && (
            <button
              onClick={test}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              Test connection
            </button>
          )}
          <button
            onClick={disconnectCred}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-1.5 text-[13px] font-semibold text-bad transition-colors hover:border-[#3a1a1a] disabled:opacity-60"
          >
            Disconnect
          </button>
          {cred.last_validated_at && (
            <span className="text-[12px] text-dim">
              Last checked {new Date(cred.last_validated_at).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Segmented switch */}
      <div className="flex gap-1 rounded-xl border border-line bg-panel2 p-1">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setMode(s.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
              mode === s.key
                ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
                : "text-mut hover:text-ink"
            }`}
          >
            <s.Icon size={14} /> {s.label}
          </button>
        ))}
      </div>

      {/* Panel per mode */}
      <div className="mt-4">
        {mode === "default" && (
          <div>
            <p className="text-[13px] text-mut">
              Your topics run on our house account in preview mode. Switch to your
              own key or account to run live on your bill.
            </p>
            <button
              onClick={useDefault}
              disabled={busy || (!cred.connected && current === "default")}
              className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel2 px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-[#31384c] disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {current === "default" ? "Currently on default" : "Use default"}
            </button>
          </div>
        )}

        {mode === "api_key" && (
          <div>
            <p className="text-[13px] text-mut">
              Paste your own Anthropic API key. Stored encrypted, never shown again.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                autoComplete="off"
                className="cyt-input"
                placeholder="sk-ant-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveKey();
                }}
              />
              <button
                onClick={saveKey}
                disabled={busy || !apiKey.trim()}
                className="cyt-gradient-bg flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                {current === "api_key" ? "Replace key" : "Connect key"}
              </button>
            </div>
          </div>
        )}

        {mode === "oauth" && (
          <div>
            <p className="text-[13px] text-mut">
              Connect through a secure sign-in — no keys to copy. Your usage is
              billed to your account.
            </p>
            <button
              onClick={connectOauth}
              disabled={busy || cred.oauth_available === false}
              className="cyt-gradient-bg mt-3 flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Link2 size={15} />
              )}
              {current === "oauth" ? "Reconnect account" : "Connect account"}
            </button>
            {cred.oauth_available === false && (
              <p className="mt-2 text-[12px] text-dim">
                Account connect isn&apos;t enabled on this server yet — use an API
                key.
              </p>
            )}
          </div>
        )}
      </div>

      {msg && (
        <p className={`mt-3 text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------- helpers --------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
