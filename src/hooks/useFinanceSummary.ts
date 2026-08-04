"use client";

import { useEffect, useRef, useState } from "react";
import { cytapi, type FinanceSummary } from "@/lib/api";
import { useResearchStore } from "@/store/useResearchStore";

/**
 * Polls GET /finance/summary for the real per-company financials (incl. AI
 * spend). Also refetches when the WS bumps the "finance" section so the spend
 * KPI stays current. Fail-soft: keeps last-good data.
 */
export function useFinanceSummary(
  companyId?: string | number,
  pollIntervalMs = 20000,
  enabled = true,
) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelled = useRef(false);
  const financeBump = useResearchStore((s) => s.newCounts.finance ?? 0);

  useEffect(() => {
    cancelled.current = false;

    const load = async () => {
      try {
        const data = await cytapi.financeSummary(companyId);
        if (!cancelled.current) setSummary(data);
      } catch {
        // Backend not up / no snapshot yet — fail soft.
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    };

    load();
    if (!enabled) {
      return () => {
        cancelled.current = true;
      };
    }
    const interval = setInterval(load, pollIntervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(interval);
    };
  }, [companyId, pollIntervalMs, financeBump, enabled]);

  return { summary, loading };
}
