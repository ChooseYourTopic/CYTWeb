"use client";

import { useEffect, useRef, useState } from "react";
import { cytapi, type AgentStatus } from "@/lib/api";

/** Polls GET /agents/status on an interval. Fail-soft: keeps last-good data. */
export function useAgentStatus(pollIntervalMs = 30000) {
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    const load = async () => {
      try {
        const data = await cytapi.agentStatus();
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
    const interval = setInterval(load, pollIntervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return { statuses, loading, error };
}
