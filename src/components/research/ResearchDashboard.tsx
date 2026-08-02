"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { KpiTiles } from "@/components/research/KpiTiles";
import { SectionTabs } from "@/components/research/SectionTabs";
import { LivingReport } from "@/components/research/LivingReport";
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

  const { data: overview, loading } = useSectionData<TopicOverview>(
    "overview",
    () => cytapi.topicOverview(topicId),
    20000,
  );

  // Real per-company financials (incl. AI spend) for the spend KPI tile.
  const { summary: finance } = useFinanceSummary();

  // Reset the tab to Overview whenever the topic changes.
  const setActive = useResearchStore((s) => s.setActiveSection);
  useEffect(() => {
    setActive("overview");
  }, [topicId, setActive]);

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
      <header className="mb-6 mt-6 flex items-center gap-3 text-[17px] font-bold tracking-tight">
        <a href="/" className="flex items-center gap-3 text-ink">
          <span className="cyt-gradient-bg grid h-7 w-7 place-items-center rounded-lg text-[13px] font-extrabold text-bg">
            {BRAND.MARK}
          </span>
          {BRAND.APP_NAME}
        </a>
      </header>

      {/* Topic header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[13px] uppercase tracking-wide text-mut">
            Your topic
          </div>
          <h2 className="mt-1 text-[24px] font-bold tracking-tight">
            {topicName}
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
              <LivingReport overview={overview} loading={loading} />
            )}
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

        <InvestigationRail />
      </div>
    </main>
  );
}
