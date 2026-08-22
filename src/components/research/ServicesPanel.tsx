"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Wrench,
  Send,
  Check,
  ArrowRight,
  Mic,
  Square,
  Plug,
  Loader2,
  Receipt,
  Scale,
  Megaphone,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/useResearchStore";
import {
  cytapi,
  type ServicesHub,
  type ServiceCategory,
  type CatalogItem,
} from "@/lib/api";

/**
 * Services — the professional-services marketplace (D4), two front doors in one tab:
 *   1. Professional service REQUESTS: describe work you want done for you and it
 *      routes to the fulfillment queue (request -> fulfillment -> results-view).
 *   2. One-click ENGAGE: the curated catalog (tax, legal, advertising/marketing,
 *      training) the topic can subscribe to in a single click.
 * Fulfillment is external, routed to provider partners through the adapter layer —
 * each service shows Live/Simulated from its provider and a Connect affordance until
 * a key is wired. Live from the topic's Services hub.
 */

// The request chips — quick-drop prompts for the request box (kept from the shipped
// UX: financial-assistance / grants / inventory alongside the classics).
const REQUEST_CHIPS = [
  "Set up my Google Business profile",
  "Build me a landing page",
  "Run a local ad campaign",
  "File my LLC paperwork",
  "Apply for financial assistance",
  "Write grants",
  "Inventory management",
];

// The example the placeholder shows; Tab autocompletes it into the field.
const REQUEST_EXAMPLE = "Set up my business email and connect it to the website";

// The professional-services categories the request can be filed under (D4).
const REQUEST_CATEGORIES: { key: ServiceCategory; label: string }[] = [
  { key: "other", label: "General" },
  { key: "tax", label: "Tax" },
  { key: "legal", label: "Legal" },
  { key: "advertising", label: "Advertising" },
  { key: "training", label: "Training" },
];

// An icon per catalog category — professional-services framing.
const CATEGORY_ICON: Record<ServiceCategory, typeof Wrench> = {
  tax: Receipt,
  legal: Scale,
  advertising: Megaphone,
  training: GraduationCap,
  other: Sparkles,
};

const STATUS_STYLE: Record<string, string> = {
  requested: "border-brand/40 bg-brand/10 text-brand",
  in_progress: "border-[#31384c] bg-panel2 text-warn",
  delivered: "border-good/40 bg-good/10 text-good",
  cancelled: "border-line bg-panel2 text-dim",
};

export function ServicesPanel({ topicId }: { topicId: string }) {
  const [hub, setHub] = useState<ServicesHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("other");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recRef = useRef<any>(null);
  const setActive = useResearchStore((s) => s.setActiveSection);

  const load = useCallback(async () => {
    try {
      setHub(await cytapi.services(topicId));
    } catch {
      /* fail-soft — keep the last good hub */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  // Voice capture — the browser SpeechRecognition API (same front door as the
  // Media creator). Dictated text is appended to the request; it's transcribed
  // locally, nothing leaves the device.
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setMicSupported(true);
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) setRequest((prev) => (prev ? `${prev} ${text}` : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.abort?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  function toggleMic() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  // Tab on an empty field autocompletes the example (like the /start suggestions).
  function onRequestKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && !e.shiftKey && !request.trim()) {
      e.preventDefault();
      setRequest(REQUEST_EXAMPLE);
    }
  }

  async function submitRequest() {
    if (!request.trim() || submitting) return;
    setSubmitting(true);
    try {
      await cytapi.submitServiceRequest(topicId, {
        category,
        body: request.trim(),
      });
      setRequest("");
      setSent(true);
      await load();
    } catch {
      /* fail-soft */
    } finally {
      setSubmitting(false);
    }
  }

  // A catalog service is engaged when it holds an active subscription.
  const activeKeys = new Set(
    (hub?.subscriptions ?? [])
      .filter((s) => s.status === "active")
      .map((s) => s.service_key),
  );

  async function toggleSubscribe(item: CatalogItem) {
    if (busyKey) return;
    setBusyKey(item.key);
    const engaged = activeKeys.has(item.key);
    try {
      if (engaged) {
        await cytapi.unsubscribeService(topicId, item.key);
      } else {
        await cytapi.subscribeService(topicId, { service_key: item.key });
      }
      await load();
    } catch {
      /* fail-soft */
    } finally {
      setBusyKey(null);
    }
  }

  const catalog = hub?.catalog ?? [];
  const requests = hub?.requests ?? [];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Services</h3>
        <p className="text-[13px] text-mut">
          Request professional work done for you, or engage a service in one click —
          tax, legal, advertising, and training, fulfilled by our partners.
        </p>
      </div>

      {/* 1. Professional service requests */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <Wrench size={14} className="text-brand" /> Request a professional service
        </div>
        {sent ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-good/40 bg-good/10 p-3 text-[12.5px] text-good">
              <Check size={15} className="mt-0.5 flex-none" />
              <span>
                Request received — it&apos;s queued for fulfillment by our partner
                team. Track its progress and results below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-[12px] font-semibold text-mut transition-colors hover:text-ink"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={onRequestKeyDown}
                rows={3}
                placeholder={`e.g. ${REQUEST_EXAMPLE}…  (press Tab to autocomplete)`}
                className="min-h-[68px] w-full resize-y rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:outline-none"
              />
              {/* Bright voice-record button — tap to talk, speech-to-text. */}
              <button
                type="button"
                onClick={toggleMic}
                disabled={!micSupported}
                aria-pressed={listening}
                title={
                  micSupported
                    ? listening
                      ? "Stop recording"
                      : "Tap to talk — dictate your request"
                    : "Voice input needs Chrome, Edge, or Safari"
                }
                className={cn(
                  "flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white shadow-sm transition-colors disabled:opacity-40",
                  listening
                    ? "animate-pulse bg-red-500"
                    : "bg-orange-500 hover:bg-orange-400",
                )}
              >
                {listening ? <Square size={15} /> : <Mic size={16} />}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-dim">
              <kbd className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-mut">
                Tab
              </kbd>
              autocompletes the example · tap the orange mic to talk
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REQUEST_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRequest((p) => (p ? `${p}\n${c}` : c))}
                  className="rounded-full border border-line bg-panel2 px-2.5 py-1 text-[11.5px] text-mut transition-colors hover:text-ink"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              {/* Category the request is filed under (D4). */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="rounded-xl border border-line bg-panel2 px-2.5 py-2 text-[12.5px] text-ink focus:outline-none"
              >
                {REQUEST_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={submitRequest}
                disabled={!request.trim() || submitting}
                className="cyt-gradient-bg inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold text-bg transition-opacity disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </>
        )}

        {/* Request history — the fulfillment queue with live status. */}
        {requests.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            <div className="text-[11px] uppercase tracking-wider text-dim">
              Your requests
            </div>
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-line bg-panel2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[12.5px] text-ink">{r.body}</div>
                  <div className="text-[11px] capitalize text-dim">
                    {r.category}
                    {r.provider ? ` · ${r.provider}` : ""}
                  </div>
                </div>
                <span
                  className={cn(
                    "flex-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold capitalize",
                    STATUS_STYLE[r.status] ?? "border-line bg-panel text-mut",
                  )}
                >
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. One-click engage — the professional-services catalog */}
      <div>
        <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
          One-click services
        </div>
        {loading ? (
          <p className="text-[13px] text-mut">Loading the catalog…</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((s) => {
              const Icon = CATEGORY_ICON[s.category] ?? Sparkles;
              const on = activeKeys.has(s.key);
              const busy = busyKey === s.key;
              return (
                <div
                  key={s.key}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel2 text-mut">
                      <Icon size={15} />
                    </span>
                    {/* Live / Simulated per service, from its provider adapter. */}
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
                        s.mode === "live"
                          ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
                          : "border-line bg-panel2 text-mut",
                      )}
                    >
                      {s.mode === "live" ? "Live" : "Simulated"}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-ink">{s.label}</div>
                  <div className="line-clamp-2 text-[12px] leading-snug text-mut">
                    {s.blurb}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSubscribe(s)}
                    disabled={busy}
                    className={cn(
                      "mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-60",
                      on
                        ? "border border-good/40 bg-good/10 text-good"
                        : "cyt-gradient-bg text-bg",
                    )}
                  >
                    {busy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : on ? (
                      <>
                        <Check size={13} /> Engaged
                      </>
                    ) : (
                      <>
                        Engage <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                  {/* Connect the provider to flip this service live. */}
                  {!s.connected && (
                    <button
                      type="button"
                      onClick={() => setActive("integrations")}
                      className="inline-flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-mut transition-colors hover:text-ink"
                    >
                      <Plug size={12} /> Connect provider
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-dim">
          One-click engage routes to our partner layer — each service goes live the
          moment its integration is connected.
        </p>
      </div>
    </div>
  );
}
