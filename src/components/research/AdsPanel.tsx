"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Users, Plug, Loader2, ExternalLink } from "lucide-react";
import { SectionPanel } from "@/components/research/SectionPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { useResearchStore } from "@/store/useResearchStore";
import { cytapi, type AdsHub, type IntegrationHealth } from "@/lib/api";

/** Live / Simulated pill from an integration's health. */
function ModeBadge({ health }: { health: IntegrationHealth }) {
  const live = health.mode === "live" && health.ok;
  return (
    <span
      title={health.detail}
      className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide ${
        live
          ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
          : "border-line bg-panel2 text-mut"
      }`}
    >
      {live ? "Live" : "Simulated"}
    </span>
  );
}

/** A small labelled metric. */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-dim">{label}</div>
    </div>
  );
}

/** Ads page — Lead Interlink (ad + lead engine) + Salesforce (CRM), then the
 *  ads_management agent's own draft campaign plans. */
export function AdsPanel({ topicId }: { topicId: string }) {
  const [hub, setHub] = useState<AdsHub | null>(null);
  const [loading, setLoading] = useState(true);
  const setActive = useResearchStore((s) => s.setActiveSection);

  const load = useCallback(async () => {
    try {
      setHub(await cytapi.adsHub(topicId));
    } catch {
      /* fail-soft */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  const li = hub?.lead_interlink;
  const sf = hub?.salesforce;

  // Ad-driven totals across Lead Interlink campaigns.
  const totals = (li?.campaigns ?? []).reduce(
    (a, c) => ({
      spend: a.spend + (c.daily_budget_usd ?? 0),
      clicks: a.clicks + (c.clicks ?? 0),
      leads: a.leads + (c.leads ?? 0),
    }),
    { spend: 0, clicks: 0, leads: 0 },
  );

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <Megaphone size={16} className="text-brand" /> Ads &amp; leads
        </h3>
        <p className="text-[13px] text-mut">
          Your marketing engines — Lead Interlink runs the ad campaigns &amp;
          generates leads, Salesforce is where they land. Connect a key to go
          live; until then this shows a simulated view.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] text-mut">Loading your ads hub…</p>
      ) : (
        <>
          {/* Lead Interlink */}
          <Card>
            <CardHeader>
              <span className="flex items-center justify-between">
                <span>Lead Interlink — ad campaigns</span>
                {li && <ModeBadge health={li.health} />}
              </span>
            </CardHeader>
            <div className="p-4">
              <div className="mb-3 grid grid-cols-3 gap-3">
                <Stat label="Daily budget" value={`$${totals.spend}`} />
                <Stat label="Clicks" value={totals.clicks.toLocaleString()} />
                <Stat label="Leads" value={totals.leads} />
              </div>
              <div className="space-y-2">
                {(li?.campaigns ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-dim">
                        {c.channel} · {c.status} · ${c.daily_budget_usd ?? 0}/day
                      </div>
                    </div>
                    <div className="text-[11.5px] text-mut">
                      {(c.impressions ?? 0).toLocaleString()} impr ·{" "}
                      {c.clicks ?? 0} clicks · {c.leads ?? 0} leads
                    </div>
                  </div>
                ))}
              </div>
              {!li?.connected && (
                <button
                  type="button"
                  onClick={() => setActive("integrations")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut hover:text-ink"
                >
                  <Plug size={13} /> Connect Lead Interlink
                </button>
              )}
            </div>
          </Card>

          {/* Leads → Salesforce */}
          <Card>
            <CardHeader>
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={13} /> Leads &amp; CRM (Salesforce)
                </span>
                {sf && <ModeBadge health={sf.health} />}
              </span>
            </CardHeader>
            <div className="p-4">
              <div className="space-y-2">
                {(sf?.leads ?? li?.leads ?? []).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-ink">
                        {l.name}
                      </div>
                      <div className="text-[11px] text-dim">
                        {l.company ? `${l.company} · ` : ""}
                        {l.source ?? "—"}
                      </div>
                    </div>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-mut">
                      {l.status ?? l.stage ?? "new"}
                    </span>
                  </div>
                ))}
              </div>
              {!sf?.connected && (
                <button
                  type="button"
                  onClick={() => setActive("integrations")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mut hover:text-ink"
                >
                  <Plug size={13} /> Connect Salesforce
                </button>
              )}
            </div>
          </Card>

          <a
            href="https://leadinterlink.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-mut hover:text-ink"
          >
            About Lead Interlink <ExternalLink size={12} />
          </a>
        </>
      )}

      {/* The ads_management agent's own draft campaign plans. */}
      <SectionPanel
        topicId={topicId}
        sectionKey="ads"
        title="Agent campaign plans"
        subtitle="What your ads specialist has drafted — budgets and projected metrics, draft-only."
        emptyLabel="The ads agent is drafting your first campaign plan…"
        trendLabel="Projected performance"
      />
    </div>
  );
}
