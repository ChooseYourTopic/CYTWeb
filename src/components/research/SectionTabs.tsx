"use client";

import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/useResearchStore";
import type { SectionKey } from "@/lib/api";

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "context", label: "Context" },
  { key: "integrations", label: "Integrations" },
  { key: "models", label: "Models" },
  { key: "status", label: "Status" },
  { key: "competitors", label: "Competitors" },
  { key: "market", label: "Market" },
  { key: "drafts", label: "Drafts" },
  { key: "outreach", label: "Outreach" },
  { key: "support", label: "Support" },
  { key: "ads", label: "Ads" },
  { key: "build", label: "Build" },
  { key: "finance", label: "Finance" },
  { key: "decisions", label: "Decisions" },
  { key: "report", label: "Report" },
  { key: "automations", label: "Automations" },
  { key: "network", label: "Network" },
  { key: "security", label: "Security" },
];

/**
 * The core five tabs that ship with the base ChooseYourTopic experience
 * (Standard view). Expert/Advanced view reveals every tab in SECTIONS.
 */
export const CORE_SECTIONS: SectionKey[] = [
  "overview",
  "context",
  "integrations",
  "models",
  "status",
  "competitors",
  "market",
  "drafts",
  "report",
  "automations",
  "network",
  "security",
];

/**
 * Tabbed report canvas switcher with a per-tab "new results" badge fed by the
 * research store (WS bumps the counter; clicking a tab flushes it).
 */
export function SectionTabs() {
  const active = useResearchStore((s) => s.activeSection);
  const newCounts = useResearchStore((s) => s.newCounts);
  const setActive = useResearchStore((s) => s.setActiveSection);
  const viewMode = useResearchStore((s) => s.viewMode);

  // Standard view shows only the core five; advanced reveals every tab.
  const visible =
    viewMode === "advanced"
      ? SECTIONS
      : SECTIONS.filter((s) => CORE_SECTIONS.includes(s.key));

  return (
    <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2.5">
      {visible.map(({ key, label }) => {
        const n = newCounts[key] ?? 0;
        const isActive = key === active;
        // New results highlight the whole tab in the brand light-blue instead of
        // showing a count badge.
        const hasNew = n > 0 && !isActive;
        return (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
              isActive
                ? "border-line bg-panel2 text-ink"
                : hasNew
                  ? "border-brand/60 bg-brand/15 text-brand"
                  : "border-transparent text-mut hover:text-ink",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
