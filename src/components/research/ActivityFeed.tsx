"use client";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import { cn, label, timeAgo } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/api";

const LEVEL_DOT: Record<ActivityEvent["level"], string> = {
  info: "bg-brand",
  success: "bg-good",
  warning: "bg-warn",
  error: "bg-bad",
};

/**
 * Presentational feed — pure, easy to test. Renders newest-first events with a
 * connection indicator and a purposeful empty state.
 */
export function ActivityFeedView({
  events,
  connected,
}: {
  events: ActivityEvent[];
  connected: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-1 pb-2 text-[11px] text-dim">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            connected ? "bg-good" : "bg-dim",
          )}
        />
        {connected ? "Live" : "Reconnecting…"}
      </div>

      <div className="cyt-scroll max-h-[360px] flex-1 overflow-auto px-1">
        {events.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-dim">
            The investigation log starts here as agents get to work…
          </p>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="flex gap-2.5 border-b border-[#1b2030] py-2 text-[13px] last:border-0"
            >
              <span
                className={cn(
                  "mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full",
                  LEVEL_DOT[ev.level],
                )}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11.5px] text-dim">
                  <span>{label(ev.agent_type)}</span>
                  {ev.created_at && <span>· {timeAgo(ev.created_at)}</span>}
                </div>
                <div className="text-ink">{ev.summary || ev.action}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Container — wires the live hook to the view, scoped to a topic/company. */
export function ActivityFeed({ companyId }: { companyId?: string | number }) {
  const { events, connected } = useActivityFeed({ maxEvents: 100, companyId });
  return <ActivityFeedView events={events} connected={connected} />;
}
