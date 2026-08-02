"use client";

import { Spinner } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";

/**
 * Common panel chrome: heading + subhead, and the three fail-soft states
 * (loading skeletons, empty "agents working" state, and content).
 */
export function PanelShell({
  title,
  subtitle,
  loading,
  isEmpty,
  emptyLabel = "Agents are working on this…",
  children,
}: {
  title: string;
  subtitle?: string;
  loading: boolean;
  isEmpty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[280px] p-4">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {subtitle && <p className="mb-3.5 text-[13px] text-mut">{subtitle}</p>}

      {loading && isEmpty ? (
        <div className="space-y-2.5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isEmpty ? (
        <div className="py-10 text-center text-[13.5px] text-dim">
          <Spinner className="mr-2" />
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </div>
  );
}
