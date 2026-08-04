"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { KpiTiles } from "@/components/research/KpiTiles";
import { SectionTabs, CORE_SECTIONS } from "@/components/research/SectionTabs";
import { LivingReport } from "@/components/research/LivingReport";
import { ContextPanel } from "@/components/research/ContextPanel";
import { IntegrationsPanel } from "@/components/research/IntegrationsPanel";
import { ModelsPanel } from "@/components/research/ModelsPanel";
import { CompetitorPanel } from "@/components/research/CompetitorPanel";
import { MarketSignalsPanel } from "@/components/research/MarketSignalsPanel";
import { DraftsPanel } from "@/components/research/DraftsPanel";
import { DecisionsPanel } from "@/components/research/DecisionsPanel";
import { ReportArtifact } from "@/components/research/ReportArtifact";
import { FinancePanel } from "@/components/research/FinancePanel";
import { OutreachPanel } from "@/components/research/OutreachPanel";
import { SupportPanel } from "@/components/research/SupportPanel";
import { AdsPanel } from "@/components/research/AdsPanel";
import { BuildPanel } from "@/components/research/BuildPanel";
import { InvestigationRail } from "@/components/research/InvestigationRail";
import { useSectionData } from "@/hooks/useSectionData";
import { useFinanceSummary } from "@/hooks/useFinanceSummary";
import { useResearchStore } from "@/store/useResearchStore";
import { cytapi, type TopicOverview } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { ArrowLeft, Search, Pause, Play, Loader2 } from "lucide-react";

/** Live-vs-preview pill in the topic header. Links to Settings to switch. */
function RunModeBadge({
  mode,
  source,
}: {
  mode?: "live" | "preview";
  source?: "user" | "platform" | "none";
}) {
  if (!mode) return null;
  const live = mode === "live";
  const text = live
    ? source === "user"
      ? "Live · your account"
      : "Live"
    : "Preview";
  return (
    <Link
      href="/settings"
      title={
        live
          ? "Agents are making real model calls"
          : "Preview mode — connect your account in Settings to run live"
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        live
          ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
          : "border-line bg-panel2 text-mut hover:text-ink"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-good" : "bg-dim"}`}
      />
      {text}
    </Link>
  );
}

/** Pause / Resume the whole project from the topic header. */
function ProjectPauseToggle({
  paused,
  busy,
  onToggle,
}: {
  paused: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      title={
        paused
          ? "Resume this project — restore the agents where they left off"
          : "Pause this project — soft-shut the agents down and save their state"
      }
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
        paused
          ? "border-[#1f3d2e] bg-[#0e1c16] text-good hover:brightness-125"
          : "border-line bg-panel2 text-mut hover:text-ink"
      }`}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : paused ? (
        <Play size={14} />
      ) : (
        <Pause size={14} />
      )}
      <span className="hidden sm:inline">{paused ? "Resume" : "Pause"}</span>
    </button>
  );
}

/** Standard / Expert view switch — collapses or reveals the per-agent tabs. */
function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: "standard" | "advanced";
  onChange: (m: "standard" | "advanced") => void;
}) {
  const opts: { key: "standard" | "advanced"; label: string }[] = [
    { key: "standard", label: "Standard" },
    { key: "advanced", label: "Expert" },
  ];
  return (
    <div
      className="flex rounded-xl border border-line bg-panel2 p-0.5"
      title="Standard shows the core tabs; Expert reveals every per-agent tab"
    >
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
            mode === o.key
              ? "bg-panel text-ink shadow-[0_0_0_1px_#31384c]"
              : "text-mut hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The living research dashboard: KPI row, a tabbed report canvas that fills in
 * progressively, and an always-on investigation rail (live feed + agents).
 * All live data flows through client hooks; every surface fails soft to
 * skeletons/placeholders when the backend is not up.
 */
export function ResearchDashboard({
  topicId,
  fallbackTopic,
}: {
  topicId: string;
  fallbackTopic?: string;
}) {
  const active = useResearchStore((s) => s.activeSection);

  // Paused (soft-shutdown) state is server-owned. `pausedState` is null until the
  // overview loads (or a toggle sets it optimistically); a paused project halts
  // all live polling.
  const [pausedState, setPausedState] = useState<boolean | null>(null);
  const [pauseBusy, setPauseBusy] = useState(false);
  const paused = pausedState ?? false;

  const { data: overview, loading, refetch } = useSectionData<TopicOverview>(
    "overview",
    () => cytapi.topicOverview(topicId),
    20000,
    !paused,
  );

  // Seed the paused state from the server once the overview first loads.
  useEffect(() => {
    if (pausedState === null && overview?.paused !== undefined) {
      setPausedState(overview.paused);
    }
  }, [overview?.paused, pausedState]);

  async function togglePause() {
    const next = !paused;
    setPauseBusy(true);
    setPausedState(next); // optimistic
    try {
      if (next) {
        await cytapi.pauseTopic(topicId);
      } else {
        await cytapi.resumeTopic(topicId);
      }
      refetch();
    } catch {
      setPausedState(!next); // revert
    } finally {
      setPauseBusy(false);
    }
  }

  // Real per-company financials (incl. AI spend) for the spend KPI tile.
  const { summary: finance } = useFinanceSummary(topicId, 20000, !paused);

  // Reset the tab to Overview whenever the topic changes.
  const setActive = useResearchStore((s) => s.setActiveSection);
  useEffect(() => {
    setActive("overview");
  }, [topicId, setActive]);

  // Standard vs Expert view — seeded from the user's saved preference.
  const viewMode = useResearchStore((s) => s.viewMode);
  const setViewMode = useResearchStore((s) => s.setViewMode);
  useEffect(() => {
    let cancelled = false;
    cytapi
      .me()
      .then((me) => {
        if (!cancelled && me.preferences?.view_mode) {
          setViewMode(me.preferences.view_mode);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setViewMode]);

  // If the active tab is hidden in Standard view, fall back to Overview.
  useEffect(() => {
    if (viewMode === "standard" && !CORE_SECTIONS.includes(active)) {
      setActive("overview");
    }
  }, [viewMode, active, setActive]);

  async function changeViewMode(next: "standard" | "advanced") {
    if (next === viewMode) return;
    setViewMode(next); // optimistic
    try {
      await cytapi.updatePreferences({ view_mode: next });
    } catch {
      // keep the optimistic value; it re-syncs from the server on next load
    }
  }

  const topicName = overview?.topic ?? fallbackTopic ?? "Your topic";
  const tagline =
    overview?.tagline ??
    "Company created · agents deployed · researching in the background";
  const cycleDay = overview?.cycle_day ?? 1;
  const cyclePhase = overview?.cycle_phase ?? "morning plan";
  const findings = overview?.kpis?.findings ?? 0;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16">
      {/* Top bar */}
      <header className="mb-6 mt-6 flex items-center justify-between gap-3">
        <a
          href="/"
          className="flex items-center gap-3 text-[17px] font-bold tracking-tight text-ink"
        >
          <span className="cyt-gradient-bg grid h-7 w-7 place-items-center rounded-lg text-[13px] font-extrabold text-bg">
            {BRAND.MARK}
          </span>
          {BRAND.APP_NAME}
        </a>

        <div className="flex items-center gap-2">
          <ViewModeToggle mode={viewMode} onChange={changeViewMode} />
          <ProjectPauseToggle
            paused={paused}
            busy={pauseBusy}
            onToggle={togglePause}
          />
          {/* Back to the home profile to browse or search for other topics */}
          <Link
            href="/dashboard"
            title="Back to your topics — start or search for another topic"
            className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-[13px] text-mut transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Your topics</span>
            <Search size={13} className="opacity-70" />
          </Link>
        </div>
      </header>

      {/* Topic header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[13px] uppercase tracking-wide text-mut">
            Your topic
          </div>
          <h2 className="mt-1 flex items-center gap-2.5 text-[24px] font-bold tracking-tight">
            {topicName}
            <RunModeBadge mode={overview?.run_mode} source={overview?.run_source} />
          </h2>
          <div className="text-[14px] text-mut">{tagline}</div>
        </div>
        <div className="rounded-card border border-line bg-panel px-4 py-3 text-right">
          <div className="text-[12px] uppercase tracking-wide text-mut">
            Cycle
          </div>
          <div className="text-[18px] font-bold">Day {cycleDay}</div>
          <div className="text-[12px] text-dim">{cyclePhase}</div>
        </div>
      </div>

      {paused ? (
        /* Paused: no KPI row, no panels, no rail — so every live hook unmounts
           and polling fully stops until the user resumes. */
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-[#4a3b1a] bg-[#1c1708] text-warn">
              <Pause size={24} />
            </span>
            <div>
              <h3 className="text-[18px] font-bold text-ink">Project paused</h3>
              <p className="mx-auto mt-1 max-w-[420px] text-[14px] text-mut">
                The live dashboard for{" "}
                <span className="text-ink">{topicName}</span> has stopped
                refreshing. Your findings so far are saved — resume any time to
                pick the investigation back up.
              </p>
            </div>
            <button
              type="button"
              onClick={togglePause}
              disabled={pauseBusy}
              className="cyt-gradient-bg mt-1 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-bg disabled:opacity-60"
            >
              {pauseBusy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} strokeWidth={2.5} />
              )}
              Resume project
            </button>
          </div>
        </Card>
      ) : (
        <>
          <KpiTiles
            overview={overview}
            finance={finance}
            findings={Number(findings)}
            loading={loading}
          />

          {/* Canvas + investigation rail */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <Card>
              <SectionTabs />
              <div>
                {active === "overview" && (
                  <LivingReport
                    overview={overview}
                    loading={loading}
                    topicId={topicId}
                  />
                )}
                {active === "context" && <ContextPanel topicId={topicId} />}
                {active === "integrations" && <IntegrationsPanel />}
                {active === "models" && <ModelsPanel />}
                {active === "competitors" && (
                  <CompetitorPanel topicId={topicId} />
                )}
                {active === "market" && <MarketSignalsPanel topicId={topicId} />}
                {active === "drafts" && <DraftsPanel topicId={topicId} />}
                {active === "outreach" && <OutreachPanel topicId={topicId} />}
                {active === "support" && <SupportPanel topicId={topicId} />}
                {active === "ads" && <AdsPanel topicId={topicId} />}
                {active === "build" && <BuildPanel topicId={topicId} />}
                {active === "finance" && <FinancePanel topicId={topicId} />}
                {active === "decisions" && <DecisionsPanel />}
                {active === "report" && <ReportArtifact />}
              </div>
            </Card>

            <InvestigationRail companyId={topicId} />
          </div>
        </>
      )}
    </main>
  );
}
