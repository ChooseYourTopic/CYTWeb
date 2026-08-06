"use client";

import { useEffect, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";

/**
 * A single reusable drill-down modal for KPI stat tiles: an overlay + centered
 * panel that matches the existing modal styling (see LivingReport's modals). It
 * owns the chrome (title, count, close, loading / empty / error states) and
 * renders the caller-provided list as children. Click-outside and Esc close it.
 */
export function DrillDownModal({
  title,
  subtitle,
  count,
  loading,
  error,
  empty,
  emptyLabel = "Nothing to show yet.",
  footer,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  loading: boolean;
  error?: string | null;
  empty: boolean;
  emptyLabel?: string;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  // Close on Escape — matches the click-outside affordance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-[16px] font-bold leading-snug text-ink">
              {title}
              {typeof count === "number" && (
                <span className="rounded-full border border-line bg-panel2 px-2 py-0.5 text-[12px] font-semibold text-mut">
                  {count}
                </span>
              )}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] text-mut">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-mut transition-colors hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-mut">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-[13px] text-bad">{error}</div>
          ) : empty ? (
            <div className="py-10 text-center text-[13px] text-mut">
              {emptyLabel}
            </div>
          ) : (
            children
          )}
        </div>

        {footer && !loading && !error && (
          <div className="border-t border-line px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Small status pill reused across the drill-down lists. */
export function StatusPill({ status }: { status?: string | null }) {
  const s = (status ?? "").toLowerCase();
  const tone =
    s === "completed" || s === "succeeded" || s === "success" || s === "published"
      ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
      : s === "failed" || s === "error"
        ? "border-[#43201f] bg-[#1c0e0e] text-bad"
        : s === "running" || s === "in_progress"
          ? "border-[#1e2f45] bg-[#0d1725] text-brand"
          : "border-line bg-panel2 text-mut";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}
    >
      {s ? s.replace(/_/g, " ") : "—"}
    </span>
  );
}
