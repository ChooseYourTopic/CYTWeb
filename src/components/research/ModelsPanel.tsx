"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  cytapi,
  ApiError,
  type AiCredential,
  type AiProvider,
  type LadderRung,
} from "@/lib/api";

type Model = {
  name: string;
  category: string;
  desc: string;
  color: string;
  initial: string;
  // Set when this model has a LIVE provider adapter you can connect a key for.
  // Absent = catalog-only (coming soon).
  provider?: AiProvider;
  keyHint?: string;
};

// The addressable catalog. Anthropic is handled separately (the default provider,
// its own card). OpenAI + Grok now have live adapters — connectable with a key.
const MODELS: Model[] = [
  { name: "Google Gemini", category: "LLM", desc: "Gemini 3.6 Flash — generous free tier.", color: "#4285F4", initial: "G", provider: "gemini", keyHint: "AIza… / AQ.…" },
  { name: "OpenAI GPT", category: "LLM", desc: "GPT-4o & the GPT family.", color: "#10A37F", initial: "O", provider: "openai", keyHint: "sk-…" },
  { name: "xAI Grok", category: "LLM", desc: "Grok models from xAI.", color: "#111827", initial: "X", provider: "grok", keyHint: "xai-…" },
  { name: "Meta Llama", category: "Open weight", desc: "Open-weight Llama models.", color: "#0668E1", initial: "L" },
  { name: "Mistral", category: "Open weight", desc: "Mistral & Mixtral models.", color: "#FF7000", initial: "M" },
  { name: "DeepSeek", category: "Open weight", desc: "DeepSeek reasoning models.", color: "#4D6BFE", initial: "D" },
  { name: "Cohere", category: "LLM", desc: "Command models for enterprise.", color: "#39594D", initial: "C" },
];

/** Pull the operator-friendly message out of an ApiError's JSON body. */
function serverMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const brace = e.message.indexOf("{");
    if (brace >= 0) {
      try {
        const body = JSON.parse(e.message.slice(brace));
        if (typeof body?.message === "string") return body.message;
      } catch {
        /* fall through */
      }
    }
  }
  return fallback;
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/**
 * The Anthropic (Claude) credential — the live provider powering the agents.
 * Lets the user register a key, replace it at any time, test it, or deactivate
 * it. Talks to /me/ai-credential; secrets are never returned by the API.
 */
function AnthropicCredentialCard() {
  const [cred, setCred] = useState<AiCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "disconnect" | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setCred(await cytapi.aiCredential.get());
    } catch {
      /* fail-soft: leave as unknown, the actions still work */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connected = cred?.connected === true;
  const needsReauth = cred?.status === "needs_reauth";
  const outOfCredits = cred?.status === "insufficient_credit";

  async function saveKey() {
    const k = keyInput.trim();
    if (!k || busy) return;
    setBusy("save");
    setMsg(null);
    try {
      const res = await cytapi.aiCredential.saveApiKey(k);
      setCred(res);
      setKeyInput("");
      setShowForm(false);
      const resumed = (res as { resumed_topics?: number }).resumed_topics ?? 0;
      setMsg({
        ok: true,
        text:
          "Key registered — your agents run on your account." +
          (resumed > 0 ? ` Resumed ${resumed} parked topic${resumed === 1 ? "" : "s"}.` : ""),
      });
    } catch (e) {
      setMsg({ ok: false, text: serverMessage(e, "Couldn't save that key — check it and try again.") });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    if (busy) return;
    setBusy("test");
    setMsg(null);
    try {
      const res = await cytapi.aiCredential.validate();
      setCred(res);
      setMsg({ ok: res.ok, text: res.message });
    } catch (e) {
      setMsg({ ok: false, text: serverMessage(e, "Couldn't reach Anthropic to test the key.") });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy("disconnect");
    setMsg(null);
    try {
      await cytapi.aiCredential.disconnect();
      setConfirmOff(false);
      await load();
      setMsg({
        ok: true,
        text: "Key deactivated. Topics on your account pause until you register a new one.",
      });
    } catch (e) {
      setMsg({ ok: false, text: serverMessage(e, "Couldn't deactivate — please try again.") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-panel p-4 ${
        outOfCredits ? "border-[#4a2020]" : connected && !needsReauth ? "border-[#1f3d2e]" : needsReauth ? "border-[#3a3320]" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold text-white"
          style={{ backgroundColor: "#D97757" }}
        >
          A
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold text-ink">Anthropic Claude</span>
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                <Loader2 size={10} className="animate-spin" /> Checking
              </span>
            ) : outOfCredits ? (
              <span className="rounded-full border border-[#4a2020] bg-[#1c0e0e] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-bad">
                Out of credits
              </span>
            ) : connected && !needsReauth ? (
              <span className="rounded-full border border-[#1f3d2e] bg-[#0e1c16] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-good">
                Active
              </span>
            ) : needsReauth ? (
              <span className="rounded-full border border-[#3a3320] bg-[#1a1608] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-warn">
                Needs re-auth
              </span>
            ) : (
              <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-mut">
            Opus, Sonnet &amp; Haiku — powering your agents today.
          </p>

          {outOfCredits && (
            <div className="mt-2 rounded-lg border border-bad/40 bg-bad/10 px-2.5 py-1.5 text-[12px] text-bad">
              {cred?.status_message ||
                "This key is out of Anthropic credits — top up or replace it."}{" "}
              Then hit <span className="font-semibold">Test</span> to clear it.
            </div>
          )}

          {/* Connection detail */}
          {connected && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-dim">
              {cred?.account_label && (
                <span className="inline-flex items-center gap-1 text-mut">
                  <Shield size={11} /> {cred.account_label}
                </span>
              )}
              <span>{cred?.auth_type === "oauth" ? "connected account" : "API key"}</span>
              {cred?.last_validated_at && <span>checked {fmt(cred.last_validated_at)}</span>}
            </div>
          )}

          {/* Register / replace key form */}
          {showForm ? (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] uppercase tracking-wide text-dim">
                {connected ? "Replace with a new key" : "Register your Anthropic API key"}
              </label>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-…"
                className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:border-brand focus:outline-none"
              />
              <p className="text-[11px] text-dim">
                We validate the key with Anthropic before saving — a bad key is never stored.
                Your existing key stays active until a new one is verified.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveKey}
                  disabled={busy === "save" || keyInput.trim().length < 40}
                  className="cyt-gradient-bg inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-bg disabled:opacity-60"
                >
                  {busy === "save" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  {connected ? "Save new key" : "Register key"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setKeyInput("");
                    setMsg(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-mut hover:text-ink"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setMsg(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:text-brand"
              >
                {connected ? <RefreshCw size={12} /> : <Plus size={12} />}
                {connected ? "Re-register key" : "Register a key"}
              </button>

              {connected && cred?.auth_type === "api_key" && (
                <button
                  type="button"
                  onClick={test}
                  disabled={busy === "test"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut hover:text-ink disabled:opacity-60"
                >
                  {busy === "test" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Test
                </button>
              )}

              {connected &&
                (confirmOff ? (
                  <span className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={disconnect}
                      disabled={busy === "disconnect"}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-bad/50 px-2.5 py-1.5 text-[12px] font-semibold text-bad hover:bg-bad/10 disabled:opacity-60"
                    >
                      {busy === "disconnect" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Confirm deactivate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOff(false)}
                      className="text-[12px] text-mut hover:text-ink"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmOff(true);
                      setMsg(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut hover:text-bad"
                  >
                    <Trash2 size={12} /> Deactivate
                  </button>
                ))}
            </div>
          )}

          {msg && (
            <p className={`mt-2 text-[12px] ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One alternate-provider tile. When the model has a LIVE adapter (openai/grok),
 * Connect opens an inline key form and saves a provider-tagged credential — a real
 * connection, not a placeholder. Others show "Coming soon". Note: one active
 * provider credential at a time (the multi-provider priority ladder is next), so
 * connecting here switches the account's active provider.
 */
function ModelTile({
  model,
  connected,
  onConnected,
}: {
  model: Model;
  connected?: boolean;
  onConnected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const supported = !!model.provider;
  const active = !!connected;

  async function save() {
    const k = keyInput.trim();
    if (!k || busy || !model.provider) return;
    setBusy(true);
    setMsg(null);
    try {
      await cytapi.aiCredential.saveApiKey(k, model.provider);
      setKeyInput("");
      setOpen(false);
      setMsg({ ok: true, text: `${model.name} connected — it's now your active provider.` });
      onConnected();
    } catch (e) {
      setMsg({ ok: false, text: serverMessage(e, "Couldn't save that key — check it and try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold text-white"
        style={{ backgroundColor: model.color }}
      >
        {model.initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-ink">{model.name}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-dim">
            {model.category}
          </span>
          {active && (
            <span className="rounded-full border border-[#1f3d2e] bg-[#0e1c16] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-good">
              Active
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12.5px] text-mut">{model.desc}</p>

        {supported ? (
          open ? (
            <div className="mt-2.5 space-y-2">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={model.keyHint}
                className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:border-brand focus:outline-none"
              />
              <p className="text-[11px] text-dim">
                Billed to your own {model.name} account. This becomes your active
                provider, replacing the current one.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || keyInput.trim().length < 20}
                  className="cyt-gradient-bg inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-bg disabled:opacity-60"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Connect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setKeyInput("");
                    setMsg(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-mut hover:text-ink"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setMsg(null);
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut hover:text-ink"
            >
              {active ? <RefreshCw size={12} /> : <Plug size={12} />}
              {active ? "Replace key" : "Connect"}
            </button>
          )
        ) : (
          <button
            type="button"
            disabled
            title="Adapter on the way"
            className="mt-2.5 inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-dim opacity-60"
          >
            Coming soon
          </button>
        )}

        {msg && (
          <p className={`mt-2 text-[12px] ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}

/**
 * The provider LADDER — every connected provider in priority order. The engine
 * tries them top-first and cascades to the next when one runs out of credits.
 * Reorder with the arrows; remove a rung with the trash icon.
 */
function ProviderLadder({
  ladder,
  onChange,
}: {
  ladder: LadderRung[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (ladder.length === 0) return null;

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (busy || j < 0 || j >= ladder.length) return;
    const next = [...ladder];
    [next[i], next[j]] = [next[j], next[i]];
    setBusy(true);
    try {
      await cytapi.aiCredentials.reorder(next.map((r) => r.provider));
      onChange();
    } catch {
      /* fail-soft */
    } finally {
      setBusy(false);
    }
  }

  async function remove(provider: AiProvider) {
    if (busy) return;
    setBusy(true);
    try {
      await cytapi.aiCredentials.disconnect(provider);
      onChange();
    } catch {
      /* fail-soft */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-[13px] font-bold text-ink">Provider ladder</div>
      <p className="mt-0.5 text-[12px] text-mut">
        Tried top-first. When one runs out of credits, your agents fall to the
        next automatically.
      </p>
      <div className="mt-3 space-y-2">
        {ladder.map((r, i) => (
          <div
            key={r.provider}
            className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/10 text-[11px] font-bold text-brand">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold capitalize text-ink">
                  {r.provider}
                </span>
                {r.status === "insufficient_credit" ? (
                  <span className="rounded-full border border-[#4a2020] bg-[#1c0e0e] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-bad">
                    Out of credits
                  </span>
                ) : r.status === "active" ? (
                  <span className="rounded-full border border-[#1f3d2e] bg-[#0e1c16] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-good">
                    Active
                  </span>
                ) : null}
              </div>
              {r.account_label && (
                <div className="text-[11px] text-dim">{r.account_label}</div>
              )}
            </div>
            <button
              type="button"
              disabled={busy || i === 0}
              onClick={() => move(i, -1)}
              title="Higher priority"
              className="rounded p-1 text-mut hover:text-ink disabled:opacity-30"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              disabled={busy || i === ladder.length - 1}
              onClick={() => move(i, 1)}
              title="Lower priority"
              className="rounded p-1 text-mut hover:text-ink disabled:opacity-30"
            >
              <ChevronDown size={15} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(r.provider)}
              title="Remove"
              className="rounded p-1 text-mut hover:text-bad disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Models tab — connect the AI models that power a project's agents. Anthropic is
 * the default provider (its own card); OpenAI + Grok + Gemini connect with a key
 * and form a cascade ladder; the rest are catalog-only until their adapters ship.
 */
export function ModelsPanel() {
  // Prompt the user to activate an agent (connect a model) when none is
  // connected yet — dismissible ("Maybe later"). Agents can't run without a
  // registered model (API key, OAuth, or the XTKRecall MCP).
  const [cred, setCred] = useState<AiCredential | null>(null);
  const [ladder, setLadder] = useState<LadderRung[]>([]);
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const refresh = useCallback(() => {
    cytapi.aiCredential
      .get()
      .then(setCred)
      .catch(() => {})
      .finally(() => setChecked(true));
    cytapi.aiCredentials
      .list()
      .then((r) => setLadder(r.ladder))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const needsActivation = checked && !cred?.connected && !dismissed;
  const connectedProviders = new Set(ladder.map((r) => r.provider));

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">AI models</h3>
        <p className="text-[13px] text-mut">
          Connect the models that power your agents. Claude runs them today — more
          are rolling out.
        </p>
      </div>

      {needsActivation && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#223257] bg-brand/10 p-4">
          <span className="mt-0.5 shrink-0 text-brand">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-ink">
              Activate an agent to get started
            </div>
            <p className="mt-0.5 text-[12.5px] text-mut">
              Your agents can&apos;t run until a model is connected. Register your
              Anthropic key below — or connect via the XTKRecall MCP — to activate
              your crew.
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="mt-2 inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut hover:text-ink"
            >
              Maybe later
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            title="Dismiss"
            className="shrink-0 text-dim hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <AnthropicCredentialCard />

      <ProviderLadder ladder={ladder} onChange={refresh} />

      <div className="pt-1 text-[12px] uppercase tracking-wider text-dim">More models</div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODELS.map((m) => (
          <ModelTile
            key={m.name}
            model={m}
            connected={!!m.provider && connectedProviders.has(m.provider)}
            onConnected={refresh}
          />
        ))}
      </div>

      <p className="text-[12px] text-dim">
        Connect a provider with your own API key — it bills to your account. One
        active provider at a time for now; a provider priority ladder that
        auto-cascades when one runs out is on the way.
      </p>
    </div>
  );
}
