"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Wrench,
  Wifi,
  Phone,
  CreditCard,
  Shield,
  Cloud,
  Send,
  Check,
  ArrowRight,
  Mic,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Services — two front doors in one tab:
 *   1. Professional service requests: describe work you want done for you and it
 *      routes to the fulfillment queue (request -> fulfillment -> results-view).
 *   2. One-click services: a curated catalog of subscribable services (discount
 *      internet, business phone/VoIP, payments, and the like) the topic can turn on
 *      in a single click.
 * Scaffold / interface pass — mock-first + config-gated; requests and subscriptions
 * wire to the partner/fulfillment layer next. Live for feedback now.
 */

type Service = {
  key: string;
  label: string;
  blurb: string;
  price: string;
  icon: typeof Wifi;
};

const SERVICE_CATALOG: Service[] = [
  { key: "internet", label: "Discount Business Internet", blurb: "Negotiated bulk-rate fiber for your location.", price: "from $39/mo", icon: Wifi },
  { key: "phone", label: "Business Phone / VoIP", blurb: "A business line, auto-attendant, and SMS.", price: "from $19/mo", icon: Phone },
  { key: "payments", label: "Payments & Checkout", blurb: "Take cards and send pay-links in minutes.", price: "2.6% + 10c", icon: CreditCard },
  { key: "insurance", label: "Business Insurance", blurb: "Liability coverage matched to your trade.", price: "quote", icon: Shield },
  { key: "cloud", label: "Cloud Backup & Storage", blurb: "Off-site encrypted backup for your files.", price: "from $9/mo", icon: Cloud },
];

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

export function ServicesPanel() {
  const [request, setRequest] = useState("");
  const [sent, setSent] = useState(false);
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recRef = useRef<any>(null);

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

  function submitRequest() {
    if (!request.trim()) return;
    setSent(true);
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Services</h3>
        <p className="text-[13px] text-mut">
          Request professional work done for you, or turn on a service in one click.
        </p>
      </div>

      {/* 1. Professional service requests */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <Wrench size={14} className="text-brand" /> Request a professional service
        </div>
        {sent ? (
          <div className="flex items-start gap-2 rounded-xl border border-good/40 bg-good/10 p-3 text-[12.5px] text-good">
            <Check size={15} className="mt-0.5 flex-none" />
            <span>
              Request received — it&apos;s queued for the fulfillment team. You&apos;ll see
              progress and results here. (Routing to the fulfillment queue is being wired up.)
            </span>
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
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={submitRequest}
                disabled={!request.trim()}
                className="cyt-gradient-bg inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold text-bg transition-opacity disabled:opacity-50"
              >
                <Send size={14} /> Submit request
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2. One-click subscribable services */}
      <div>
        <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
          One-click services
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATALOG.map((s) => {
            const Icon = s.icon;
            const on = subscribed[s.key];
            return (
              <div
                key={s.key}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel2 text-mut">
                    <Icon size={15} />
                  </span>
                  <span className="text-[11.5px] font-semibold text-dim">{s.price}</span>
                </div>
                <div className="text-[13px] font-semibold text-ink">{s.label}</div>
                <div className="line-clamp-2 text-[12px] leading-snug text-mut">{s.blurb}</div>
                <button
                  type="button"
                  onClick={() => setSubscribed((m) => ({ ...m, [s.key]: !m[s.key] }))}
                  className={cn(
                    "mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors",
                    on
                      ? "border border-good/40 bg-good/10 text-good"
                      : "cyt-gradient-bg text-bg",
                  )}
                >
                  {on ? (
                    <>
                      <Check size={13} /> Subscribed
                    </>
                  ) : (
                    <>
                      Subscribe <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-dim">
          One-click subscribe routes to our partner layer — each service goes live the
          moment its integration is connected.
        </p>
      </div>
    </div>
  );
}
