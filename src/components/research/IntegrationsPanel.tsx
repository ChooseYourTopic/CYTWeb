"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Plug,
  X,
  ExternalLink,
  Loader2,
  Trash2,
  KeyRound,
} from "lucide-react";
import { cytapi } from "@/lib/api";
import { INTEGRATIONS, type IntegrationDef } from "@/lib/integrations";

/** Connect modal: enter this service's token/secret key, or sign up to get one. */
function ConnectModal({
  integration,
  topicId,
  connected,
  onClose,
  onSaved,
  onDisconnected,
}: {
  integration: IntegrationDef;
  topicId?: string;
  connected: boolean;
  onClose: () => void;
  onSaved: (key: string) => void;
  onDisconnected: (key: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const filled = integration.fields.some(
    (f) => (values[f.key] ?? "").trim() !== "",
  );

  async function save() {
    if (!topicId || busy || !filled) return;
    setBusy(true);
    setMsg(null);
    try {
      const creds: Record<string, string> = {};
      for (const f of integration.fields) {
        const v = (values[f.key] ?? "").trim();
        if (v) creds[f.key] = v;
      }
      await cytapi.saveIntegration(topicId, integration.key, creds);
      onSaved(integration.key);
      setMsg({ ok: true, text: `${integration.name} connected.` });
    } catch {
      setMsg({ ok: false, text: "Couldn't save that — check the value and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!topicId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.disconnectIntegration(topicId, integration.key);
      onDisconnected(integration.key);
      onClose();
    } catch {
      setMsg({ ok: false, text: "Couldn't disconnect. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-[14px] font-extrabold text-white"
              style={{ backgroundColor: integration.color }}
            >
              {integration.initial}
            </span>
            <div>
              <h3 className="text-[16px] font-bold text-ink">
                {integration.name}
                {connected ? (
                  <span className="ml-2 align-middle text-[11px] font-semibold text-good">
                    · Connected
                  </span>
                ) : null}
              </h3>
              <p className="text-[12px] text-mut">{integration.desc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-mut transition-colors hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Path 1 — enter your own token / secret key. */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <KeyRound size={14} className="text-brand" /> Enter your credentials
          </div>
          <div className="grid gap-2.5">
            {integration.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-[12px] text-mut">{f.label}</span>
                <input
                  type="password"
                  autoComplete="off"
                  className="cyt-input"
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-mut transition-colors hover:text-ink"
          >
            Where to find this <ExternalLink size={12} />
          </a>
          <div className="mt-3">
            <button
              type="button"
              onClick={save}
              disabled={busy || !filled || !topicId}
              className="cyt-gradient-bg inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {connected ? "Update connection" : "Connect"}
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-dim">
            Stored encrypted and scoped to this topic — never shown again.
          </p>
        </div>

        {/* Path 2 — request credentials: sign up for the service (referral link). */}
        <div className="mt-5 rounded-xl border border-line bg-panel2 p-3.5">
          <div className="text-[13px] font-semibold text-ink">
            Don&apos;t have an account?
          </div>
          <p className="mt-0.5 text-[12px] text-mut">
            Create one to get your {integration.name} token, then paste it above.
          </p>
          <a
            href={integration.affiliateUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-[#31384c]"
          >
            Create a {integration.name} account <ExternalLink size={13} />
          </a>
        </div>

        {(connected || msg) && (
          <div className="mt-4 flex items-center justify-between gap-2">
            {msg ? (
              <span className={`text-[12.5px] ${msg.ok ? "text-good" : "text-bad"}`}>
                {msg.text}
              </span>
            ) : (
              <span />
            )}
            {connected && (
              <button
                type="button"
                onClick={disconnect}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-bad transition-colors hover:border-[#3a1a1a] disabled:opacity-60"
              >
                <Trash2 size={13} /> Disconnect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Integrations tab — a catalog of services a topic can connect. Each Connect
 * opens a modal to enter that service's token/secret key, or to sign up for an
 * account (referral link) when the user doesn't have one yet.
 */
export function IntegrationsPanel({ topicId }: { topicId?: string }) {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<IntegrationDef | null>(null);

  const load = useCallback(() => {
    if (!topicId) return;
    cytapi
      .topicIntegrations(topicId)
      .then((r) =>
        setConnected(
          new Set(
            r.connections
              .filter((c) => c.status === "connected")
              .map((c) => c.provider),
          ),
        ),
      )
      .catch(() => {});
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Integrations</h3>
        <p className="text-[13px] text-mut">
          Connect the services your project uses — enter a token or secret key, or
          sign up for an account to get one.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => {
          const on = connected.has(i.key);
          return (
            <div
              key={i.key}
              className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold text-white"
                style={{ backgroundColor: i.color }}
              >
                {i.initial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{i.name}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                    {i.category}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-mut">{i.desc}</p>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    on
                      ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                      : "border-line text-mut hover:text-ink"
                  }`}
                >
                  {on ? (
                    <>
                      <Check size={12} /> Connected
                    </>
                  ) : (
                    <>
                      <Plug size={12} /> Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <ConnectModal
          integration={active}
          topicId={topicId}
          connected={connected.has(active.key)}
          onClose={() => setActive(null)}
          onSaved={(k) => setConnected((prev) => new Set(prev).add(k))}
          onDisconnected={(k) =>
            setConnected((prev) => {
              const n = new Set(prev);
              n.delete(k);
              return n;
            })
          }
        />
      )}
    </div>
  );
}
