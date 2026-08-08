"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { KpiTiles } from "@/components/research/KpiTiles";
import {
  SectionTabs,
  CORE_SECTIONS,
  BASIC_SECTIONS,
} from "@/components/research/SectionTabs";
import { LivingReport } from "@/components/research/LivingReport";
import { BattlePassPanel } from "@/components/research/BattlePassPanel";
import { ContextPanel } from "@/components/research/ContextPanel";
import { IntegrationsPanel } from "@/components/research/IntegrationsPanel";
import { ModelsPanel } from "@/components/research/ModelsPanel";
import { StatusPanel } from "@/components/research/StatusPanel";
import { TeamStatusPanel } from "@/components/research/TeamStatusPanel";
import { AutomationsPanel } from "@/components/research/AutomationsPanel";
import { NetworkPanel } from "@/components/research/NetworkPanel";
import { SecurityPanel } from "@/components/research/SecurityPanel";
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
import { MediaPanel } from "@/components/research/MediaPanel";
import { InvestigationRail } from "@/components/research/InvestigationRail";
import { useSectionData } from "@/hooks/useSectionData";
import { useFinanceSummary } from "@/hooks/useFinanceSummary";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useResearchStore } from "@/store/useResearchStore";
import { cytapi, type TopicOverview, type ViewMode } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

/** Basic / Standard / Expert view switch — collapses or reveals per-agent tabs. */
function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  const opts: { key: ViewMode; label: string }[] = [
    { key: "basic", label: "Basic" },
    { key: "standard", label: "Standard" },
    { key: "advanced", label: "Expert" },
  ];
  return (
    <div
      className="flex rounded-xl border border-line bg-panel2 p-0.5"
      title="Basic shows the essentials; Standard the core tabs; Expert every per-agent tab"
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

  const router = useRouter();

  const { data: overview, loading, refetch, errorStatus } =
    useSectionData<TopicOverview>(
      "overview",
      () => cytapi.topicOverview(topicId),
      20000,
      !paused,
    );

  // Ownership/license wall (server-enforced): a topic that isn't on this account
  // returns 404 (existence-hiding for a cross-account id) or 403 (owned but the
  // license is inactive). Either way it isn't theirs to view — send them back to
  // their own dashboard with a clear notice instead of polling a dead skeleton.
  useEffect(() => {
    if (errorStatus === 403 || errorStatus === 404) {
      router.replace("/dashboard?notice=not-your-topic");
    }
  }, [errorStatus, router]);

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

  // Drive the "agents active" KPI from the SAME live status the agent-team
  // lights use, so the count and the lights never disagree. Active = an agent
  // running right now or with queued work; all idle => 0.
  const { statuses: agentStatuses } = useAgentStatus(topicId, 20000, !paused);
  const activeAgents = agentStatuses.filter((s) => {
    const st = (s.last_run_status ?? "").toLowerCase();
    return (
      st === "running" ||
      st === "in_progress" ||
      (s.tasks_pending ?? 0) > 0
    );
  }).length;

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

  // If the active tab is hidden in the current view, fall back to Overview.
  useEffect(() => {
    const allowed =
      viewMode === "advanced"
        ? null
        : viewMode === "basic"
          ? BASIC_SECTIONS
          : CORE_SECTIONS;
    if (allowed && !allowed.includes(active)) {
      setActive("overview");
    }
  }, [viewMode, active, setActive]);

  async function changeViewMode(next: ViewMode) {
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
    <main
      className="mx-auto max-w-[1180px] px-6 pb-16"
      // Page identity: stamps the accessing owner + their license + this topic
      // onto the page element itself, so the page is self-identifying and can be
      // matched to the license of whoever is viewing it (the server-side
      // ownership + license wall remains the real enforcement; this is the
      // client-visible identifier). access_sig is the signed, owner+license-bound
      // handle echoed back as X-Topic-Signature.
      id={
        overview?.user_id
          ? `topic-${topicId}-user-${overview.user_id}`
          : `topic-${topicId}`
      }
      data-topic-id={topicId}
      data-user-id={overview?.user_id ?? undefined}
      data-license-id={overview?.license?.id ?? undefined}
      data-license-type={overview?.license?.type ?? undefined}
      data-license-status={overview?.license?.status ?? undefined}
      data-access-sig={overview?.access_sig ?? undefined}
      data-page-identity={
        overview?.user_id
          ? `t${topicId}·u${overview.user_id}${
              overview.license?.id ? `·${overview.license.id}` : ""
            }`
          : undefined
      }
    >
      {/* Top bar */}
      <header className="mb-6 mt-6 flex items-center justify-between gap-3">
        <Link
          href="/start"
          className="flex items-center gap-3 text-[17px] font-bold tracking-tight text-ink"
        >
          <span className="cyt-gradient-bg grid h-7 w-7 place-items-center rounded-lg text-[13px] font-extrabold text-bg">
            {BRAND.MARK}
          </span>
          {BRAND.APP_NAME}
        </Link>

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
          {overview?.license && (
            <div
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-line bg-panel2 px-2 py-0.5 text-[11px] text-mut"
              title="This topic is on your account — verified server-side by ownership + license."
            >
              <span>{overview.license.label ?? overview.license.type}</span>
              {overview.license.id && (
                <span className="font-mono text-dim"> · {overview.license.id}</span>
              )}
              {overview.license.status !== "active" && (
                <span className="text-warn"> · {overview.license.status}</span>
              )}
            </div>
          )}
        </div>
        <div className="rounded-card border border-line bg-panel px-4 py-3 text-right">
          <div className="text-[12px] uppercase tracking-wide text-mut">
            Cycle
          </div>
          <div className="text-[18px] font-bold">Day {cycleDay}</div>
          <div className="text-[12px] text-dim">{cyclePhase}</div>
        </div>
      </div>

      {/* Paused: the agents are soft shut down and the panels stop polling
          (one-shot, saved state), but everything stays navigable — a slim
          banner replaces the old blocking card so settings + every tab, incl.
          the overview, remain viewable while paused. */}
      {paused && (
        <Card>
          <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#4a3b1a] bg-[#1c1708] text-warn">
                <Pause size={18} />
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-ink">Project paused</h3>
                <p className="text-[13px] text-mut">
                  You&apos;re viewing{" "}
                  <span className="text-ink">{topicName}</span>&apos;s saved
                  state. The agents are stopped and won&apos;t take on new work
                  until you resume — settings and every tab stay open to browse.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={togglePause}
              disabled={pauseBusy}
              className="cyt-gradient-bg inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold text-bg disabled:opacity-60"
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
      )}

      <KpiTiles
        overview={overview}
        finance={finance}
        findings={Number(findings)}
        activeAgents={activeAgents}
        agentStatuses={agentStatuses}
        topicId={topicId}
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
                agentStatuses={agentStatuses}
              />
            )}
            {active === "battlepass" && <BattlePassPanel topicId={topicId} />}
            {active === "context" && <ContextPanel topicId={topicId} />}
            {active === "integrations" && (
              <IntegrationsPanel topicId={topicId} />
            )}
            {active === "models" && <ModelsPanel />}
            {active === "status" && <StatusPanel topicId={topicId} />}
            {active === "team" && <TeamStatusPanel topicId={topicId} />}
            {active === "automations" && <AutomationsPanel />}
            {active === "network" && <NetworkPanel />}
            {active === "security" && <SecurityPanel />}
            {active === "competitors" && <CompetitorPanel topicId={topicId} />}
            {active === "market" && <MarketSignalsPanel topicId={topicId} />}
            {active === "drafts" && <DraftsPanel topicId={topicId} />}
            {active === "outreach" && <OutreachPanel topicId={topicId} />}
            {active === "support" && <SupportPanel topicId={topicId} />}
            {active === "ads" && <AdsPanel topicId={topicId} />}
            {active === "build" && <BuildPanel topicId={topicId} />}
            {active === "finance" && <FinancePanel topicId={topicId} />}
            {active === "decisions" && <DecisionsPanel />}
            {active === "report" && <ReportArtifact />}
            {active === "media" && <MediaPanel />}
          </div>
        </Card>

        <InvestigationRail companyId={topicId} />
      </div>
    </main>
  );
}
