"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Megaphone,
  Mail,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { cytapi } from "@/lib/api";

type Slot = {
  icon: typeof Sun;
  name: string;
  when: string;
  desc: string;
};

const DAILY: Slot[] = [
  { icon: Sun, name: "Morning plan", when: "6:00 AM", desc: "The team lead plans the day and assigns the crew." },
  { icon: Moon, name: "Evening review", when: "8:00 PM", desc: "The day's work is tallied and summarized." },
];

const INTERVALS: Slot[] = [
  { icon: Megaphone, name: "Social content", when: "every 2 hours", desc: "Drafts posts for your approval." },
  { icon: Mail, name: "Email outreach", when: "every 3 hours", desc: "Builds prospect campaigns." },
  { icon: BarChart3, name: "Ads & finance", when: "every 6 hours", desc: "Plans campaigns and tracks spend." },
  { icon: ShieldCheck, name: "Safety sweep", when: "hourly", desc: "Re-runs any stalled work so nothing stops." },
];

function Row({ icon: Icon, name, when, desc }: Slot) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel2 text-brand">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-[13.5px] font-semibold text-ink">{name}</span>
          <span className="text-[12px] text-mut">· {when}</span>
        </div>
        <div className="text-[12.5px] text-mut">{desc}</div>
      </div>
    </div>
  );
}

/**
 * Scheduling tab — when the agent team works this project: the daily cycles and
 * the interval sweeps, in the project's timezone. Read-only for v1; per-project
 * schedule controls are the next layer.
 */
export function SchedulingPanel() {
  const [tz, setTz] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    cytapi
      .me()
      .then((m) => {
        if (!cancelled) setTz(m.preferences?.timezone ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Scheduling</h3>
          <p className="text-[13px] text-mut">
            When your agent team works on this project.
          </p>
        </div>
        <Link
          href="/settings"
          title="Change your timezone in Settings"
          className="rounded-xl border border-line bg-panel2 px-3 py-2 text-right transition-colors hover:border-[#31384c]"
        >
          <div className="text-[10.5px] uppercase tracking-wide text-dim">
            Timezone
          </div>
          <div className="text-[13px] font-semibold text-ink">
            {tz ?? "UTC (default)"}
          </div>
        </Link>
      </div>

      <div>
        <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
          Daily cycles
        </div>
        <div className="space-y-2">
          {DAILY.map((s) => (
            <Row key={s.name} {...s} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[12px] uppercase tracking-wider text-dim">
          Throughout the day
        </div>
        <div className="space-y-2">
          {INTERVALS.map((s) => (
            <Row key={s.name} {...s} />
          ))}
        </div>
      </div>

      <p className="text-[12px] text-dim">
        Times follow your timezone. Per-project schedule controls are on the way.
      </p>
    </div>
  );
}
