"use client";

import { useEffect, useState } from "react";
import { X, Send, Rocket, Megaphone } from "lucide-react";
import { client, type SectionItem } from "@/lib/api";
import { label } from "@/lib/utils";

/** Steering actions: item.action → endpoint + button copy + icon. */
const ACTIONS = {
  publish: {
    verb: "Publish",
    pending: "Publishing…",
    done: "Published ✓",
    Icon: Send,
    endpoint: (id: SectionItem["id"]) => `/social/posts/${id}/publish`,
  },
  send: {
    verb: "Send",
    pending: "Sending…",
    done: "Sent ✓",
    Icon: Megaphone,
    endpoint: (id: SectionItem["id"]) => `/outreach/campaigns/${id}/send`,
  },
  launch: {
    verb: "Launch",
    pending: "Launching…",
    done: "Launched ✓",
    Icon: Rocket,
    endpoint: (id: SectionItem["id"]) => `/ads/campaigns/${id}/launch`,
  },
} as const;

/**
 * Progressive-disclosure primitive reused by every section: a collapsed
 * summary card that expands into a full reading view (modal dialog). Summary
 * first; detail on demand — never a wall of text. When the item carries an
 * `action`, it also renders a steering button (publish/send/launch) that POSTs
 * to the backend with optimistic feedback.
 */
export function ProgressiveCard({ item }: { item: SectionItem }) {
  const [open, setOpen] = useState(false);
  const [actState, setActState] = useState<
    "idle" | "pending" | "done" | "error"
  >("idle");
  const hasDetail = Boolean(item.detail);
  const act = item.action ? ACTIONS[item.action] : null;

  async function runAction(e: React.MouseEvent) {
    e.stopPropagation();
    if (!act || actState === "pending" || actState === "done") return;
    setActState("pending");
    try {
      await client.post(act.endpoint(item.id));
      setActState("done");
    } catch {
      setActState("error");
    }
  }

  return (
    <>
      <div
        onClick={() => hasDetail && setOpen(true)}
        className={
          "animate-rise block w-full rounded-[11px] border border-line bg-panel2 p-4 text-left transition-colors hover:border-[#31384c]" +
          (hasDetail ? " cursor-pointer" : "")
        }
        data-testid="progressive-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="font-semibold text-ink">{item.title}</div>
          {item.is_new && (
            <span className="shrink-0 rounded-full border border-[#223257] bg-[#16203a] px-2 py-0.5 text-[11px] text-brand">
              new
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] text-mut">{item.summary}</p>
        <div className="mt-2.5 flex items-center gap-2">
          {item.agent_type && (
            <span className="inline-block rounded-full border border-[#223257] bg-[#16203a] px-2 py-0.5 text-[11px] text-brand">
              {label(item.agent_type)}
            </span>
          )}
          {item.status && (
            <span className="text-[11px] uppercase tracking-wide text-dim">
              {item.status}
            </span>
          )}
          {hasDetail && (
            <span className="ml-auto text-[12px] text-dim">Expand →</span>
          )}
        </div>

        {act && (
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            {actState === "done" ? (
              <span className="text-[13px] font-medium text-good">
                {act.done}
              </span>
            ) : (
              <button
                type="button"
                onClick={runAction}
                disabled={actState === "pending"}
                className="flex items-center gap-1.5 rounded-lg border border-[#223257] bg-brand/10 px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
              >
                <act.Icon size={14} />
                {actState === "pending" ? act.pending : act.verb}
              </button>
            )}
            {actState === "error" && (
              <span className="text-[12px] text-bad">Failed — try again</span>
            )}
            <span className="ml-auto text-[11px] text-dim">
              nothing goes out without your go
            </span>
          </div>
        )}
      </div>

      {open && hasDetail && (
        <Dialog title={item.title} onClose={() => setOpen(false)}>
          {item.agent_type && (
            <div className="mb-3 text-[12px] uppercase tracking-wide text-dim">
              {label(item.agent_type)}
            </div>
          )}
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink/90">
            {item.detail}
          </p>
        </Dialog>
      )}
    </>
  );
}

/** Minimal accessible modal (no external dep). */
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="cyt-scroll max-h-[80vh] w-full max-w-2xl overflow-auto rounded-card border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-mut hover:bg-panel2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
