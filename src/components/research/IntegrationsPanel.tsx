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
  Copy,
  Sparkles,
} from "lucide-react";
import { cytapi, type XtkRecallStatus } from "@/lib/api";
import { INTEGRATIONS, type IntegrationDef } from "@/lib/integrations";

/** The one tile that is a hosted, paid add-on rather than bring-your-own. */
const XTKRECALL_KEY = "xtkrecall_mcp";

/** Copy text to the clipboard, best-effort. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard blocked — no-op (the value is still visible to select manually)
  }
}

/** A readonly value row with a copy button (endpoint / masked key). */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-mut">{label}</span>
      <div className="flex items-center gap-2">
        <input
          readOnly
          className="cyt-input flex-1 font-mono text-[12px]"
          value={value}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => {
            void copyText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-mut transition-colors hover:text-ink"
          title="Copy"
        >
          {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
        </button>
      </div>
    </label>
  );
}

/**
 * XTKRecall MCP — the hosted, paid add-on modal. Flips on entitlement:
 *  - not entitled → "Subscribe — $X/mo" (opens Stripe Checkout);
 *  - entitled → the provisioned endpoint + masked key + cancel.
 * A small "use my own vault instead" advanced toggle keeps the bring-your-own
 * path (the existing endpoint/api_key fields) available either way.
 */
function XtkRecallModal({
  integration,
  topicId,
  status,
  byoConnected,
  onClose,
  onStatus,
  onByoSaved,
  onByoDisconnected,
}: {
  integration: IntegrationDef;
  topicId?: string;
  status: XtkRecallStatus | null;
  byoConnected: boolean;
  onClose: () => void;
  onStatus: (s: XtkRecallStatus) => void;
  onByoSaved: (key: string) => void;
  onByoDisconnected: (key: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showByo, setShowByo] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const entitled = !!status?.entitled;
  const priceMo = status ? (status.plan.price_cents / 100).toFixed(2) : null;
  const byoFilled = integration.fields.some(
    (f) => (values[f.key] ?? "").trim() !== "",
  );

  async function subscribe() {
    if (!topicId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const session = await cytapi.xtkrecall.subscribe(topicId);
      // Off to Stripe Checkout; on return the panel re-fetches status.
      window.location.assign(session.url);
    } catch {
      setMsg({ ok: false, text: "Couldn't start checkout. Try again." });
      setBusy(false);
    }
  }

  async function cancel() {
    if (!topicId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const s = await cytapi.xtkrecall.cancel(topicId);
      onStatus(s);
      setMsg({ ok: true, text: "Add-on canceled." });
    } catch {
      setMsg({ ok: false, text: "Couldn't cancel. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function saveByo() {
    if (!topicId || busy || !byoFilled) return;
    setBusy(true);
    setMsg(null);
    try {
      const creds: Record<string, string> = {};
      for (const f of integration.fields) {
        const v = (values[f.key] ?? "").trim();
        if (v) creds[f.key] = v;
      }
      await cytapi.saveIntegration(topicId, integration.key, creds);
      onByoSaved(integration.key);
      setMsg({ ok: true, text: "Your own vault is connected." });
    } catch {
      setMsg({ ok: false, text: "Couldn't save that — check the value and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function disconnectByo() {
    if (!topicId || busy) return;
    setBusy(true);
    try {
      await cytapi.disconnectIntegration(topicId, integration.key);
      onByoDisconnected(integration.key);
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
                {entitled ? (
                  <span className="ml-2 align-middle text-[11px] font-semibold text-good">
                    · Active
                  </span>
                ) : null}
              </h3>
              <p className="text-[12px] text-mut">
                Managed, hosted vault over MCP — we provision it for you.
              </p>
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

        {entitled ? (
          /* --- Entitled: show the provisioned vault + manage/cancel. --- */
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Sparkles size={14} className="text-brand" /> Your provisioned vault
            </div>
            <div className="grid gap-2.5">
              {status?.endpoint ? (
                <CopyRow label="MCP endpoint" value={status.endpoint} />
              ) : (
                <p className="text-[12px] text-mut">
                  Provisioning your vault… refresh in a moment.
                </p>
              )}
              {status?.masked_key ? (
                <CopyRow label="Scoped API key" value={status.masked_key} />
              ) : null}
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              Your key is stored encrypted and shown masked — it serves every topic
              on your account.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              {msg ? (
                <span className={`text-[12.5px] ${msg.ok ? "text-good" : "text-bad"}`}>
                  {msg.text}
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-bad transition-colors hover:border-[#3a1a1a] disabled:opacity-60"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Cancel add-on
              </button>
            </div>
          </div>
        ) : (
          /* --- Not entitled: subscribe to the hosted add-on. --- */
          <div className="mt-4 rounded-xl border border-line bg-panel2 p-3.5">
            <div className="text-[13px] font-semibold text-ink">
              {integration.desc}
            </div>
            <p className="mt-0.5 text-[12px] text-mut">
              We stand up a private, namespaced vault and mint a scoped key — no
              setup on your side.
            </p>
            <button
              type="button"
              onClick={subscribe}
              disabled={busy || !topicId}
              className="cyt-gradient-bg mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {priceMo ? `Subscribe — $${priceMo}/mo` : "Subscribe"}
            </button>
            {msg ? (
              <p className={`mt-2 text-[12.5px] ${msg.ok ? "text-good" : "text-bad"}`}>
                {msg.text}
              </p>
            ) : null}
          </div>
        )}

        {/* --- Advanced: bring your own vault instead (the BYO fallback). --- */}
        <div className="mt-5 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowByo((v) => !v)}
            className="text-[12px] font-semibold text-mut transition-colors hover:text-ink"
          >
            {showByo ? "Hide" : "Advanced —"} use my own vault instead
            {byoConnected ? (
              <span className="ml-2 text-[11px] font-semibold text-good">· Connected</span>
            ) : null}
          </button>

          {showByo && (
            <div className="mt-3">
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
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveByo}
                  disabled={busy || !byoFilled || !topicId}
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-[13px] font-bold text-ink disabled:opacity-60"
                >
                  {byoConnected ? "Update" : "Connect"} my vault
                </button>
                {byoConnected && (
                  <button
                    type="button"
                    onClick={disconnectByo}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-bad transition-colors hover:border-[#3a1a1a] disabled:opacity-60"
                  >
                    <Trash2 size={13} /> Disconnect
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11.5px] text-dim">
                Stored encrypted and scoped to this topic — never shown again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
 * account (referral link) when the user doesn't have one yet. The XTKRecall MCP
 * tile is special: it's a hosted, paid add-on that flips between "Subscribe" and
 * a provisioned endpoint/key based on the owner's entitlement.
 */
export function IntegrationsPanel({ topicId }: { topicId?: string }) {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<IntegrationDef | null>(null);
  const [xtk, setXtk] = useState<XtkRecallStatus | null>(null);

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
    // The XTKRecall MCP add-on entitlement (drives the Subscribe ↔ manage flip).
    cytapi.xtkrecall
      .status(topicId)
      .then(setXtk)
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
          const isXtk = i.key === XTKRECALL_KEY;
          const entitled = isXtk && !!xtk?.entitled;
          // "On" = hosted add-on active, or a bring-your-own connection exists.
          const on = entitled || connected.has(i.key);
          const label = entitled
            ? "Active"
            : isXtk && xtk && !xtk.entitled
              ? "Subscribe"
              : on
                ? "Connected"
                : "Connect";
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
                  {isXtk ? (
                    <span className="rounded-full border border-[#3a2c5a] bg-[#160f27] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-brand">
                      Hosted
                    </span>
                  ) : null}
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
                  {on ? <Check size={12} /> : isXtk ? <Sparkles size={12} /> : <Plug size={12} />}
                  {label}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {active &&
        (active.key === XTKRECALL_KEY ? (
          <XtkRecallModal
            integration={active}
            topicId={topicId}
            status={xtk}
            byoConnected={connected.has(active.key)}
            onClose={() => setActive(null)}
            onStatus={setXtk}
            onByoSaved={(k) => setConnected((prev) => new Set(prev).add(k))}
            onByoDisconnected={(k) =>
              setConnected((prev) => {
                const n = new Set(prev);
                n.delete(k);
                return n;
              })
            }
          />
        ) : (
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
        ))}
    </div>
  );
}
