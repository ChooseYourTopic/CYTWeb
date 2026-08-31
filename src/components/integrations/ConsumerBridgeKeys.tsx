"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  X,
} from "lucide-react";
import { cytapi, ApiError, type BridgeKey, type BridgeKeyMint } from "@/lib/api";

// The owner-facing bridge-key panel, LOCKED to a single consumer (e.g. "quickerbiz"). It reuses
// CYT's existing issuance engine (`cytapi.bridgeKeys.{list,issue,revoke}`) — the same one behind
// the Settings "API Access — Empire Bridge" card — but mints ONLY for `fixedPartner` and filters
// the issued-key list to that consumer's slug (mirrors Lead Interlink's `fixedPartner` panel).
// READ-ONLY is the only live access this release; read-write is shown, disabled, reserved. The
// api key + signing secret are shown ONCE in a modal at issue and never again.

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
            Copy these now — they are shown <span className="font-semibold">once</span> and never
            again. Store them where {minted.key.partner} can reach them. If you lose them, revoke
            this key and issue a new one.
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

export function ConsumerBridgeKeys({
  partner,
  consumerName,
}: {
  /** The consumer slug the panel is locked to (e.g. "quickerbiz"). */
  partner: string;
  /** Human-facing name of the consumer, for copy. */
  consumerName: string;
}) {
  const [keys, setKeys] = useState<BridgeKey[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [access, setAccess] = useState<AccessRight>("read");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [minted, setMinted] = useState<BridgeKeyMint | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await cytapi.bridgeKeys.list();
      // Locked to this consumer: only its own keys are listed / counted here.
      setKeys(res.keys.filter((k) => k.partner === partner));
      setLoadErr(null);
    } catch {
      setKeys([]);
      setLoadErr("Couldn't load your keys.");
    }
  }, [partner]);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    if (busy || access !== "read") return; // read-write is reserved (option disabled)
    setBusy(true);
    setMsg(null);
    try {
      // Read-only this release — omit scopes so the backend applies its read defaults.
      const res = await cytapi.bridgeKeys.issue({
        partner,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      setMinted(res);
      setName("");
      await load();
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof ApiError && e.status === 422
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
      tagline: `${consumerName} can PULL your topics and customers — never change them.`,
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
      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <KeyRound size={16} className="text-brand" /> Issue &amp; manage your {consumerName} key
        </div>
        <p className="mt-1 text-[13px] text-mut">
          Issue a scoped read-only key so <b className="text-ink">{consumerName}</b> can securely
          pull your topics and customers one-way over the Empire Integration Bridge. The api key +
          signing secret are shown only once, at issue.
        </p>

        {/* Issued keys (this consumer only) */}
        <div className="mb-5 mt-4">
          <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
            Issued keys for {consumerName}
          </div>
          {keys == null ? (
            <div className="flex items-center gap-2 text-[13px] text-mut">
              <Loader2 size={14} className="animate-spin" /> Loading your keys…
            </div>
          ) : keys.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel2 px-3 py-3 text-[13px] text-mut">
              {loadErr ?? `No keys yet. Issue one below to connect ${consumerName}.`}
            </p>
          ) : (
            <ul className="grid gap-2">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-bold text-ink">{consumerName}</span>
                      {k.name && <span className="text-[12.5px] text-mut">· {k.name}</span>}
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
          )}
        </div>

        {/* Issue a key (locked to this consumer) */}
        <div className="rounded-xl border border-line bg-panel2 p-4">
          <div className="mb-3 text-[13px] font-semibold text-ink">Issue a key</div>
          <div className="grid gap-3">
            <div>
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                Consumer
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-xl border border-line bg-panel px-3 py-2 text-[13px] font-medium text-ink">
                  <span className="mr-1.5 text-mut">
                    <Lock size={12} />
                  </span>
                  <code className="font-mono">{partner}</code>
                </span>
                <span className="text-[11.5px] text-dim">Locked to this integration.</span>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                Name (optional) — a label to recognise this key later
              </span>
              <input
                className="cyt-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${consumerName} production`}
              />
            </label>

            {/* Access-rights radio — read-only default; read-write disabled/reserved. */}
            <div>
              <span className="mb-1 block text-[12px] uppercase tracking-wider text-dim">
                Access rights
              </span>
              <div className="grid gap-2" role="radiogroup" aria-label="Access rights">
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
                          <span className="text-[13.5px] font-bold text-ink">{o.title}</span>
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
                disabled={busy || access !== "read"}
                className="cyt-gradient-bg flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-bold text-bg disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                Issue read-only key
              </button>
              {msg && (
                <span className={`text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}>
                  {msg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {minted && <RevealModal minted={minted} onClose={() => setMinted(null)} />}
    </>
  );
}
