"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User as UserIcon,
  SlidersHorizontal,
  AlertTriangle,
  KeyRound,
  Link2,
  Share2,
  Copy,
  Check,
  Users,
  Cpu,
  Server,
  Terminal,
  ExternalLink,
  Plug,
  Trash2,
  Lock,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  TwoFactorCard,
  useStepUpGuard,
  STEP_UP_CANCELLED,
} from "@/components/security/TwoFactor";
import { ModelsPanel } from "@/components/research/ModelsPanel";
import {
  EMPIRE_PLATFORMS,
  EXTERNAL_PLATFORMS,
  OTHER_PLATFORM,
  platformLabel,
} from "@/lib/platform-directory";
import {
  cytapi,
  ApiError,
  type MeProfile,
  type ViewMode,
  type McpTokenStatus,
  type BridgeKey,
  type BridgeKeyMint,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await cytapi.me();
      setMe(profile);
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
          {me && <TwoFactorCard />}
          {me && <PreferencesCard me={me} />}

          {/* ===== Unified "API keys & connectivity" hub (C3) ===================
              One coherent place for every connectivity credential on the profile:
              how agents are powered, the AI-model provider keys (Claude/Gemini/
              OpenAI/Grok + priority ladder), and the outbound bridge/partner keys
              that let other platforms pull this account's data. ================ */}
          <div id="connectivity" className="scroll-mt-24">
            <ConnectivityHubHeader />
          </div>
          <ConnectionModeCard />
          <div id="ai-account" className="scroll-mt-24">
            <AiModelsCard />
          </div>
          <div id="api-access" className="scroll-mt-24">
            {me && <BridgeKeysCard />}
          </div>
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

/* ----------------- Unified connectivity hub header (C3) ------------------- */
// The single banner that introduces the "API keys & connectivity" hub — the one
// place that gathers every connectivity credential on the profile: how agents are
// powered, the AI-model provider keys, and the outbound bridge/partner keys.
function ConnectivityHubHeader() {
  return (
    <div className="rounded-2xl border border-line bg-panel2 p-5">
      <div className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.3px] text-ink">
        <Plug size={18} className="text-brand" /> API keys &amp; connectivity
      </div>
      <p className="mt-1 text-[13px] text-mut">
        One place for every credential on your profile — how your agents are powered,
        the AI-model provider keys that run them (Claude, Gemini, OpenAI, Grok), and
        the bridge keys that let other platforms connect to your data. Every key is
        tagged to the platform it&apos;s for, and issuing or connecting one is protected
        by your two-factor code.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
        <a
          href="#ai-account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 font-semibold text-ink transition-colors hover:border-[#31384c]"
        >
          <Cpu size={13} className="text-brand" /> AI models &amp; providers
        </a>
        <a
          href="#api-access"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 font-semibold text-ink transition-colors hover:border-[#31384c]"
        >
          <KeyRound size={13} className="text-brand" /> Bridge &amp; partner keys
        </a>
      </div>
    </div>
  );
}

/* --------------------------- Connection mode (E22) ------------------------ */
// "How your agents run" — the higher-level choice of HOW a topic's agents are
// powered, distinct from WHICH credential (the AI account card below). Three
// option bits: server-side on the user's API key (default), the user's own
// Claude Code driving locally over the ops-mcp connector ($0 platform cost), and
// OAuth (shown, disabled — not yet offered by Anthropic).
//
// PERSISTENCE: there is no `connection_mode` field on UserPreferences /
// MeController::updatePreferences yet, so the choice is stored in localStorage as
// an interim. A backend `connection_mode` preference field is the correlated
// backend build (NOT added here). The selection survives reload via localStorage.

type ConnectionMode = "api_key" | "claude_local" | "oauth";

const CONNECTION_MODE_KEY = "cyt:connection_mode";

/** The exact Claude Code MCP-add commands for the local ops connector. */
const CONNECTOR_CMD_NPX =
  "claude mcp add cyt-ops --env CYT_MCP_TOKEN=cyt_mcp_YOUR_TOKEN -- npx -y @chooseyourtopic/cyt-ops-connector";
const CONNECTOR_CMD_NODE =
  "claude mcp add cyt-ops --env CYT_MCP_TOKEN=cyt_mcp_YOUR_TOKEN -- node C:\\XTKRecall\\chooseyourtopic-rebuild\\cyt-ops-connector\\src\\index.js";

const CONNECTION_OPTIONS: {
  key: ConnectionMode;
  Icon: typeof KeyRound;
  title: string;
  tagline: string;
  badge: string;
  disabled?: boolean;
}[] = [
  {
    key: "api_key",
    Icon: Server,
    title: "API key — pay-as-you-go",
    tagline:
      "We run your agents server-side on your Anthropic API key. Billed to your Anthropic account.",
    badge: "Default",
  },
  {
    key: "claude_local",
    Icon: Cpu,
    title: "My Claude subscription — local",
    tagline:
      "Your own Claude Code works the tasks over a local connector, on your subscription. No per-token cost.",
    badge: "$0 platform cost",
  },
  {
    key: "oauth",
    Icon: Link2,
    title: "OAuth",
    tagline: "Connect your account with a secure sign-in — no keys to copy.",
    badge: "Coming soon",
    disabled: true,
  },
];

/** A copyable one-line shell command (never a secret — the token stays a placeholder). */
function CommandRow({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is still selectable */
    }
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] text-mut">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-semibold text-mut transition-colors hover:text-ink"
        >
          {copied ? (
            <>
              <Check size={12} className="text-good" /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="cyt-scroll overflow-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-[11.5px] leading-relaxed text-ink/90">
        {cmd}
      </pre>
    </div>
  );
}

function ConnectionModeCard() {
  const [mode, setMode] = useState<ConnectionMode>("api_key");
  const [mcp, setMcp] = useState<McpTokenStatus | null>(null);

  // Interim persistence: hydrate the saved choice, and read the per-user MCP-token
  // status (masked — never a secret) to hint whether the local connector is wired.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONNECTION_MODE_KEY);
      if (saved === "api_key" || saved === "claude_local") setMode(saved);
    } catch {
      /* storage blocked — fall back to the default */
    }
    cytapi.mcpToken
      .get()
      .then(setMcp)
      .catch(() => {});
  }, []);

  function choose(next: ConnectionMode) {
    if (next === "oauth") return; // shown but not selectable yet
    setMode(next);
    try {
      localStorage.setItem(CONNECTION_MODE_KEY, next);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
  }

  return (
    <Card
      icon={Cpu}
      title="How your agents run"
      desc="Choose how your topics are powered — on your API key, on your own Claude subscription, or a connected account."
    >
      {/* Radio cards — current selection highlighted, API key is the default. */}
      <div className="grid gap-2.5" role="radiogroup" aria-label="Connection mode">
        {CONNECTION_OPTIONS.map((o) => {
          const selected = mode === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={o.disabled}
              disabled={o.disabled}
              onClick={() => choose(o.key)}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                o.disabled
                  ? "cursor-not-allowed border-line bg-panel2 opacity-60"
                  : selected
                    ? "border-brand bg-brand/5"
                    : "border-line bg-panel2 hover:border-[#31384c]"
              }`}
            >
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  selected && !o.disabled
                    ? "bg-brand/15 text-brand"
                    : "bg-panel text-mut"
                }`}
              >
                <o.Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{o.title}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-wide ${
                      o.disabled
                        ? "border-line text-dim"
                        : o.key === "claude_local"
                          ? "border-brand/40 bg-brand/10 text-brand"
                          : "border-line text-mut"
                    }`}
                  >
                    {o.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-mut">{o.tagline}</p>
              </div>
              <span
                className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                  selected && !o.disabled
                    ? "border-brand bg-brand"
                    : "border-line"
                }`}
              >
                {selected && !o.disabled ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-bg" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Setup panel for the selected mode. */}
      <div className="mt-4">
        {mode === "api_key" && (
          <div className="rounded-xl border border-line bg-panel2 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <KeyRound size={14} className="text-brand" /> Your Anthropic key
            </div>
            <p className="text-[12.5px] text-mut">
              The platform runs your agents for you, server-side, on your own
              provider API key — pay-as-you-go. Add or replace it in the AI models
              &amp; providers section below.
            </p>
            <a
              href="#ai-account"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c]"
            >
              <KeyRound size={14} /> Manage your model keys
            </a>
          </div>
        )}

        {mode === "claude_local" && (
          <div className="rounded-xl border border-brand/40 bg-brand/5 p-3.5">
            <p className="text-[12.5px] text-mut">
              <span className="font-semibold text-ink">How it works:</span> your own
              Claude Code launches a small local connector and works your topic&apos;s
              tasks on your subscription — there&apos;s no API key and no per-token
              cost, only your Claude plan.
            </p>

            {/* Step 1 — mint the token in the Integrations tab (never shown here). */}
            <div className="mt-3">
              <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                  1
                </span>
                Mint an MCP token
                <span
                  className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    mcp?.connected
                      ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                      : "border-line text-dim"
                  }`}
                >
                  {mcp?.connected ? "Token active" : "No token yet"}
                </span>
              </div>
              <p className="text-[12px] text-mut">
                Open any topic&apos;s Integrations tab and use{" "}
                <span className="font-semibold text-ink">
                  Work with your Claude subscription
                </span>{" "}
                to generate a revocable{" "}
                <span className="font-mono">cyt_mcp_</span> token (shown once).
              </p>
              <Link
                href="/dashboard"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c]"
              >
                <ExternalLink size={14} /> Go to a topic&apos;s Integrations tab
              </Link>
            </div>

            {/* Step 2 — add the local connector to Claude Code (copyable command). */}
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                  2
                </span>
                <Terminal size={14} className="text-brand" /> Add the connector to
                Claude Code
              </div>
              <div className="grid gap-2.5">
                <CommandRow
                  label="Recommended — via npx (no checkout needed)"
                  cmd={CONNECTOR_CMD_NPX}
                />
                <CommandRow label="Local checkout — via node" cmd={CONNECTOR_CMD_NODE} />
              </div>
              <p className="mt-2 text-[11.5px] text-dim">
                Swap <span className="font-mono">cyt_mcp_YOUR_TOKEN</span> for the
                token you minted in step 1. The token is yours — never share it.
              </p>
            </div>

            {/* External-driver note. */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#2a2a12] bg-[#15140a] p-2.5 text-[11.5px] text-warn">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                While you drive a topic this way, the server-side engine pauses for
                that topic — you&apos;re the external driver until you disconnect.
              </span>
            </div>
          </div>
        )}

        {mode === "oauth" && (
          <div className="rounded-xl border border-line bg-panel2 p-3.5 text-[12.5px] text-mut">
            Connect your Claude account with a secure sign-in — no keys to copy.
          </div>
        )}
      </div>

      {/* OAuth availability note (always visible, since the option is disabled). */}
      <p className="mt-3 text-[12px] text-dim">
        OAuth is coming soon — it isn&apos;t yet available from Anthropic.
      </p>
    </Card>
  );
}

/* ---------------------- AI models & providers (hub) ----------------------- */
// The AI-model provider surface, brought INTO the unified connectivity hub. Reuses
// the existing multi-provider engine UI verbatim (<ModelsPanel/>): connect Claude /
// Gemini / OpenAI / Grok with your own key, order the priority ladder (rung 1 = your
// default model), see per-provider usage. Key entry is 2FA step-up gated inside
// ModelsPanel. This replaces the old Anthropic-only "AI account" card — one place for
// every model credential, no duplication.
function AiModelsCard() {
  return (
    <Card
      icon={Cpu}
      title="AI models & providers"
      desc="Connect the AI models that power your agents — bring your own Claude, Gemini, OpenAI or Grok key. Order them into a priority ladder (the top rung is your default; agents cascade down it when one runs out of credits). Connecting a key requires your two-factor code.">
      <div className="-mx-5 -mb-5 -mt-1">
        <ModelsPanel />
      </div>
    </Card>
  );
}

/* --------------------- API access — Empire Bridge ------------------------- */
// The owner's self-service management of Empire Integration Bridge keys — the
// scoped `cyt_qb_` bearers another Empire platform (e.g. QuickerBiz) presents to
// PULL this owner's topic + customer records ONE-WAY. Issue mints an api key +
// signing secret shown ONCE (read-only this release); read-write is reserved
// behind two-way sync and the option is disabled. Keys are masked after mint;
// one-click revoke. Never a secret is re-shown after the mint modal closes.

// The platform a key is issued FOR — SOURCED FROM THE EMPIRE PLATFORM DIRECTORY
// (`@/lib/platform-directory`) so every issued credential is associated with a specific
// platform the owner intends to use it with (Tracy 2026-09-22, enhancement #4). Two
// groups: every Kuykendall Empire product, then external partner-adapter placeholders
// (QuickBooks, Zoho, …); "Other" covers anything unlisted (tagged by a custom slug). A
// key's `partner` is that platform tag; multiple named keys per platform are supported (C1).
const OTHER_PARTNER = OTHER_PLATFORM;

/** Friendly label for a partner slug (falls back to the raw slug for custom apps). */
function partnerLabel(slug: string): string {
  return platformLabel(slug);
}

/** Group issued keys by their target-app slug, first-seen order preserved. */
function groupKeysByApp(keys: BridgeKey[]): [string, BridgeKey[]][] {
  const groups = new Map<string, BridgeKey[]>();
  for (const k of keys) {
    const arr = groups.get(k.partner) ?? [];
    arr.push(k);
    groups.set(k.partner, arr);
  }
  return Array.from(groups.entries());
}

/** A read-only value with a copy button (used in the one-time reveal modal). */
function SecretRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is still selectable */
    }
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] uppercase tracking-wider text-dim">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-semibold text-mut transition-colors hover:text-ink"
        >
          {copied ? (
            <>
              <Check size={12} className="text-good" /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="cyt-scroll overflow-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-[11.5px] leading-relaxed text-ink/90">
        {value}
      </pre>
    </div>
  );
}

/** The one-time reveal modal — shows the api key + signing secret exactly once. */
function RevealModal({
  minted,
  onClose,
}: {
  minted: BridgeKeyMint;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[520px] rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <KeyRound size={16} className="text-brand" /> Your new bridge key
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-mut transition-colors hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#3a2f12] bg-[#1c160a] p-3 text-[12.5px] text-warn">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Copy these now — they are shown <span className="font-semibold">once</span> and
            never again. Store them where {partnerLabel(minted.key.partner)} can reach them. If
            you lose them, revoke this key and issue a new one.
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          <SecretRow label="API key" value={minted.api_key} />
          <SecretRow label="Signing secret" value={minted.signing_secret} />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cyt-gradient-bg rounded-xl px-4 py-2 text-[14px] font-bold text-bg"
          >
            I&apos;ve stored them
          </button>
        </div>
      </div>
    </div>
  );
}

type AccessRight = "read" | "readwrite";

function BridgeKeysCard() {
  const [keys, setKeys] = useState<BridgeKey[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [partner, setPartner] = useState(EMPIRE_PLATFORMS[0]?.slug ?? "");
  // When "Other" is chosen, the target app is this custom slug (tags the key per app).
  const [customPartner, setCustomPartner] = useState("");
  const [name, setName] = useState("");
  const [access, setAccess] = useState<AccessRight>("read");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [minted, setMinted] = useState<BridgeKeyMint | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Revealing a key requires a fresh 2FA step-up — the guard prompts enroll/verify
  // and retries the issue once cleared. Generic: any key type inherits this gate.
  const { guard, modal: stepUpModal } = useStepUpGuard();

  const load = useCallback(async () => {
    try {
      const res = await cytapi.bridgeKeys.list();
      setKeys(res.keys);
      setLoadErr(null);
    } catch {
      setKeys([]);
      setLoadErr("Couldn't load your API keys.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The effective target-app slug: the dropdown choice, or the custom slug when "Other".
  const targetPartner =
    partner === OTHER_PARTNER
      ? customPartner.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-")
      : partner.trim();

  async function issue() {
    const p = targetPartner;
    if (!p || busy || access !== "read") return; // read-write is reserved (option disabled)
    setBusy(true);
    setMsg(null);
    try {
      // Read-only this release — omit scopes so the backend applies its read defaults.
      // Revealing the key is 2FA-gated: guard() runs the step-up (enroll/verify) on a
      // 403 challenge and retries the issue once the user clears it. Issuance is ADDITIVE
      // — a new key for an app never revokes existing keys for that app (C1 multi-key).
      const res = await guard(() =>
        cytapi.bridgeKeys.issue({
          partner: p,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      );
      setMinted(res);
      setName("");
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === STEP_UP_CANCELLED) {
        // User dismissed the 2FA prompt — no key issued, no error to show.
        return;
      }
      const notEntitled =
        e instanceof ApiError &&
        e.status === 403 &&
        e.message.includes("not_entitled");
      setMsg({
        ok: false,
        text: notEntitled
          ? "Create a topic first — a key grants a partner read access to your topics and customers."
          : e instanceof ApiError && e.status === 422
            ? "Read-write is reserved until two-way sync ships — issue a read-only key."
            : "Couldn't issue that key. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number) {
    if (revoking != null) return;
    setRevoking(id);
    setMsg(null);
    try {
      await cytapi.bridgeKeys.revoke(id);
      await load();
      setMsg({ ok: true, text: "Key revoked." });
    } catch {
      setMsg({ ok: false, text: "Couldn't revoke that key. Please try again." });
    } finally {
      setRevoking(null);
    }
  }

  const ACCESS_OPTIONS: {
    key: AccessRight;
    title: string;
    tagline: string;
    disabled?: boolean;
  }[] = [
    {
      key: "read",
      title: "Read-only",
      tagline: "The partner can PULL your topics and customers — never change them.",
    },
    {
      key: "readwrite",
      title: "Read-write",
      tagline: "Reserved — enables with two-way sync.",
      disabled: true,
    },
  ];

  return (
    <>
      <Card
        icon={Plug}
        title="API Access — Empire Bridge"
        desc="Issue scoped keys that let another Empire platform (like QuickerBiz) pull your topics and customers — one-way, read-only. Keys are shown once and can be revoked anytime. Issuing a key requires your two-factor code."
      >
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-panel2 px-3.5 py-3 text-[12.5px] text-mut">
          <Plug size={15} className="mt-0.5 shrink-0 text-brand" />
          <span>
            Browse the{" "}
            <Link href="/integrations" className="font-semibold text-brand hover:underline">
              Integrations directory
            </Link>{" "}
            to set up a specific Empire platform with a guided how-to — or issue and manage every
            key right here.
          </span>
        </div>

        {/* Issued keys */}
        <div className="mb-5">
          <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
            Issued keys
          </div>
          {keys == null ? (
            <div className="flex items-center gap-2 text-[13px] text-mut">
              <Loader2 size={14} className="animate-spin" /> Loading your keys…
            </div>
          ) : keys.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel2 px-3 py-3 text-[13px] text-mut">
              {loadErr ?? "No keys yet. Issue one below to connect a partner."}
            </p>
          ) : (
            // Grouped PER APP — each target integration gets its own labelled group,
            // so many named keys across many apps stay legible (C1 multi-key per app).
            <div className="grid gap-4">
              {groupKeysByApp(keys).map(([slug, appKeys]) => (
                <div key={slug}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[13px] font-bold text-ink">
                      {partnerLabel(slug)}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                      {appKeys.length} {appKeys.length === 1 ? "key" : "keys"}
                    </span>
                  </div>
                  <ul className="grid gap-2">
                    {appKeys.map((k) => (
                      <li
                        key={k.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-ink">
                              {k.name || "Unnamed key"}
                            </span>
                            <span className="font-mono text-[12px] text-dim">{k.label}</span>
                            {!k.live && (
                              <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                                Expired
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {k.scopes.map((s) => (
                              <span
                                key={s}
                                className="rounded-full border border-line px-2 py-0.5 font-mono text-[10.5px] text-mut"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 text-[11.5px] text-dim">
                            {k.last_used_at
                              ? `Last used ${new Date(k.last_used_at).toLocaleString()}`
                              : "Never used"}
                            {k.expires_at
                              ? ` · Expires ${new Date(k.expires_at).toLocaleDateString()}`
                              : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => revoke(k.id)}
                          disabled={revoking === k.id}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-bad transition-colors hover:border-[#3a1a1a] disabled:opacity-60"
                        >
                          {revoking === k.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issue a key */}
        <div className="rounded-xl border border-line bg-panel2 p-4">
          <div className="mb-3 text-[13px] font-semibold text-ink">Issue a key</div>
          <div className="grid gap-3">
            <Field label="Platform — the integration this key is for (from your integrations directory)">
              <select
                className="cyt-input"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
              >
                <optgroup label="Empire">
                  {EMPIRE_PLATFORMS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="External">
                  {EXTERNAL_PLATFORMS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                <option value={OTHER_PARTNER}>Other integration / app…</option>
              </select>
            </Field>
            {partner === OTHER_PARTNER && (
              <Field label="App identifier — a short slug for the target integration">
                <input
                  className="cyt-input font-mono"
                  value={customPartner}
                  onChange={(e) => setCustomPartner(e.target.value)}
                  placeholder="e.g. venuetool, leadinterlink, my-internal-app"
                />
              </Field>
            )}
            <Field label="Name — a label to tell this app's keys apart (recommended)">
              <input
                className="cyt-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production, Staging, Data-warehouse sync"
              />
            </Field>
            <p className="-mt-1 text-[11.5px] text-dim">
              You can issue several keys for the same app — name each one so you can
              recognise and revoke them independently.
            </p>

            {/* Access-rights radio — read-only default; read-write disabled/reserved. */}
            <div>
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                Access rights
              </span>
              <div
                className="grid gap-2"
                role="radiogroup"
                aria-label="Access rights"
              >
                {ACCESS_OPTIONS.map((o) => {
                  const selected = access === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={o.disabled}
                      disabled={o.disabled}
                      onClick={() => !o.disabled && setAccess(o.key)}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        o.disabled
                          ? "cursor-not-allowed border-line bg-panel opacity-60"
                          : selected
                            ? "border-brand bg-brand/5"
                            : "border-line bg-panel hover:border-[#31384c]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                          selected && !o.disabled ? "border-brand bg-brand" : "border-line"
                        }`}
                      >
                        {selected && !o.disabled ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-bg" />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-bold text-ink">
                            {o.title}
                          </span>
                          {o.disabled && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                              <Lock size={10} /> Reserved
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-mut">{o.tagline}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={issue}
                disabled={busy || !targetPartner || access !== "read"}
                className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                Issue key
              </button>
              {msg && (
                <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
                  {msg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Fresh-2FA step-up prompt (shown when issuing a key needs verification). */}
      {stepUpModal}

      {minted && (
        <RevealModal minted={minted} onClose={() => setMinted(null)} />
      )}
    </>
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
