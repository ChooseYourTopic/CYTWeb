import { cn } from "@/lib/utils";

/** Greyed animated placeholder shaped like incoming data. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-panel2/80",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** A skeleton shaped like a ProgressiveCard while a section fills in. */
export function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-panel2 p-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
    </div>
  );
}
