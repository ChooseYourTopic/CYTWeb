"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Link2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Unplug,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cytapi, ApiError, type AiCredential } from "@/lib/api";

export default function AiSettingsPage() {
  const router = useRouter();
  const [cred, setCred] = useState<AiCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<null | "key" | "oauth" | "disconnect">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCred(await cytapi.aiCredential.get());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/signin");
        return;
      }
      setError("Couldn't load your AI account settings.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveKey() {
    const key = apiKey.trim();
    if (!key || busy) return;
    setBusy("key");
    setError(null);
    setNotice(null);
    try {
      setCred(await cytapi.aiCredential.saveApiKey(key));
      setApiKey("");
      setNotice("API key connected — your agents now run on your account.");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 422
          ? "That doesn't look like a valid key."
          : "Couldn't save that key. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function connectOauth() {
    if (busy) return;
    setBusy("oauth");
    setError(null);
    try {
      const { authorize_url } = await cytapi.aiCredential.oauthStart();
      window.location.href = authorize_url; // hand off to the provider
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 501
          ? "Account connect isn't available yet — use an API key for now."
          : "Couldn't start the connection. Please try again.",
      );
      setBusy(null);
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy("disconnect");
    setError(null);
    setNotice(null);
    try {
      await cytapi.aiCredential.disconnect();
      setCred(await cytapi.aiCredential.get());
      setNotice("Disconnected.");
    } catch {
      setError("Couldn't disconnect. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const connected = cred?.connected ?? false;
  const needsReauth = cred?.status === "needs_reauth";

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

        <h1 className="mt-4 text-[28px] font-bold tracking-[-0.5px]">
          AI account
        </h1>
        <p className="mt-1 text-[14px] text-mut">
          Connect your own account so your agents&apos; work runs on your bill —
          not ours. Choose one: sign in with an account, or paste an API key.
        </p>

        {/* Current status */}
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-mut">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : connected ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    needsReauth
                      ? "bg-[#2a1c0a] text-warn"
                      : "bg-[#0e1c16] text-good"
                  }`}
                >
                  {needsReauth ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-ink">
                    {cred?.auth_type === "oauth"
                      ? "Connected account"
                      : "API key connected"}
                    {cred?.account_label ? (
                      <span className="ml-2 text-[13px] font-normal text-dim">
                        {cred.account_label}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[13px] text-mut">
                    {needsReauth
                      ? "Your connection expired — reconnect to keep agents running on your account."
                      : "Your agents run live on your own account."}
                  </div>
                </div>
              </div>
              <button
                onClick={disconnect}
                disabled={busy !== null}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-mut transition-colors hover:text-bad disabled:opacity-60"
              >
                {busy === "disconnect" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Unplug size={14} />
                )}
                Disconnect
              </button>
            </div>
          ) : (
            <div className="text-[14px] text-mut">
              No account connected yet. Until you connect one, your topics run in
              preview mode on the house account.
            </div>
          )}
        </div>

        {/* Options */}
        <div className="mt-4 grid gap-4">
          {/* OAuth */}
          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Link2 size={16} className="text-brand" /> Sign in with your
              account
            </div>
            <p className="mt-1 text-[13px] text-mut">
              Connect through a secure sign-in — no keys to copy. Your usage is
              billed to your account.
            </p>
            <button
              onClick={connectOauth}
              disabled={busy !== null || cred?.oauth_available === false}
              className="cyt-gradient-bg mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {busy === "oauth" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Link2 size={15} />
              )}
              {connected && cred?.auth_type === "oauth"
                ? "Reconnect account"
                : "Connect account"}
            </button>
            {cred?.oauth_available === false && (
              <p className="mt-2 text-[12px] text-dim">
                Account connect isn&apos;t enabled on this server yet — use an
                API key below.
              </p>
            )}
          </div>

          {/* API key */}
          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <KeyRound size={16} className="text-brand" /> Use an API key
            </div>
            <p className="mt-1 text-[13px] text-mut">
              Paste your own Anthropic API key. It&apos;s stored encrypted and
              never shown again.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-panel2 px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-dim focus:border-[#31384c]"
                placeholder="sk-ant-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveKey();
                }}
              />
              <button
                onClick={saveKey}
                disabled={busy !== null || !apiKey.trim()}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-[#31384c] disabled:opacity-60"
              >
                {busy === "key" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <KeyRound size={15} />
                )}
                Save key
              </button>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}
        {notice && <p className="mt-4 text-[13px] text-good">{notice}</p>}
      </section>
    </main>
  );
}
