import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line bg-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-line px-4 py-3 text-xs uppercase tracking-wider text-mut">
      {children}
    </h3>
  );
}

/** Small spinner matching the prototype. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={cn(
        "inline-block h-3 w-3 animate-spin rounded-full border-2 border-line border-t-brand align-[-2px]",
        className,
      )}
    />
  );
}
