"use client";

import { useEffect, useRef, useState } from "react";
import { cytapi, type AgentStatus } from "@/lib/api";

/**
 * Polls GET /agents/status on an interval, scoped to a topic/company when given.
 * Fail-soft: keeps last-good data.
 */
export function useAgentStatus(
  companyId?: string | number,
  pollIntervalMs = 30000,
  enabled = true,
) {
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    const load = async () => {
      try {
        const data = await cytapi.agentStatus(companyId);
        if (!cancelled.current) {
          setStatuses(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled.current) setError(String(e));
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
  }, [companyId, pollIntervalMs, enabled]);

  return { statuses, loading, error };
}
