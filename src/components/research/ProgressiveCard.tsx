"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { SectionItem } from "@/lib/api";
import { label } from "@/lib/utils";

/**
 * Progressive-disclosure primitive reused by every section: a collapsed
 * summary card that expands into a full reading view (modal dialog). Summary
 * first; detail on demand — never a wall of text.
 */
export function ProgressiveCard({ item }: { item: SectionItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(item.detail);

  return (
    <>
      <button
        type="button"
        onClick={() => hasDetail && setOpen(true)}
        className="animate-rise block w-full rounded-[11px] border border-line bg-panel2 p-4 text-left transition-colors hover:border-[#31384c]"
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
      </button>

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
