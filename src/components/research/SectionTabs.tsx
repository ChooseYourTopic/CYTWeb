"use client";

import { cn } from "@/lib/utils";
import { useResearchStore } from "@/store/useResearchStore";
import type { SectionKey } from "@/lib/api";

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  // NEXT sits right after Overview — next steps/actions + decisions waiting for you.
  { key: "next", label: "NEXT" },
  { key: "battlepass", label: "Impact Pass" },
  { key: "context", label: "Context" },
  { key: "integrations", label: "Integrations" },
  { key: "models", label: "Models" },
  { key: "status", label: "Status" },
  { key: "team", label: "Team" },
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
  // Media is intentionally LAST — the bottom-right tab after Integrations et al.
  { key: "media", label: "Media" },
  { key: "invoicing", label: "Invoicing" },
  { key: "services", label: "Services" },
];

/**
 * The core five tabs that ship with the base ChooseYourTopic experience
 * (Standard view). Expert/Advanced view reveals every tab in SECTIONS.
 */
export const CORE_SECTIONS: SectionKey[] = [
  "overview",
  "next",
  "battlepass",
  "context",
  "integrations",
  "models",
  "status",
  "team",
  "competitors",
  "market",
  "drafts",
  "report",
  "automations",
  "network",
  "security",
  // Media shows in Standard + Expert (kept last so it sits bottom-right).
  "media",
];

/**
 * The essentials-only "Basic" view. Curated set, rendered in this exact order
 * (Basic renders in BASIC_SECTIONS order rather than SECTIONS order). Note
 * "support" is not in CORE_SECTIONS, so it surfaces in Basic but not Standard.
 */
export const BASIC_SECTIONS: SectionKey[] = [
  "overview",
  "next", // NEXT — between Overview and Report
  "report", // "Reports"
  "team",
  "status",
  "invoicing",
  "support",
  "media",
  "battlepass", // "Impact Pass"
  "services",
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

  // Basic = essentials only; Standard = the core set; Expert (advanced) = every tab.
  const visible =
    viewMode === "advanced"
      ? SECTIONS
      : viewMode === "basic"
        ? BASIC_SECTIONS.flatMap((k) => {
            const s = SECTIONS.find((x) => x.key === k);
            return s ? [s] : [];
          })
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
