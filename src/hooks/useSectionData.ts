"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useResearchStore } from "@/store/useResearchStore";
import type { SectionKey } from "@/lib/api";

type Loader<T> = () => Promise<T>;

/**
 * Generic polled section fetch used by every research panel (competitors /
 * market / drafts / decisions / report). Refetches when the WS bumps this
 * section's "new results" counter, so heavy data comes over REST while the
 * socket only carries lightweight deltas.
 */
export function useSectionData<T>(
  section: SectionKey,
  loader: Loader<T>,
  pollIntervalMs = 20000,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const newCount = useResearchStore((s) => s.newCounts[section] ?? 0);

  const load = useCallback(async () => {
    try {
      const result = await loader();
      if (!cancelled.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (!cancelled.current) setError(String(e));
    } finally {
      if (!cancelled.current) setLoading(false);
    }
    // loader identity is owned by the caller; section keys the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    cancelled.current = false;
    load();
    const interval = setInterval(load, pollIntervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(interval);
    };
  }, [load, pollIntervalMs]);

  // Refetch when new findings for this section arrive over the socket.
  useEffect(() => {
    if (newCount > 0) load();
  }, [newCount, load]);

  return { data, loading, error, refetch: load };
}
