"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, cytapi, type ActivityEvent } from "@/lib/api";
import { useResearchStore } from "@/store/useResearchStore";

type Options = {
  maxEvents?: number;
  /** Enable REST backfill of events missed during a disconnect. */
  backfill?: boolean;
  /** Scope the feed to one topic/company. */
  companyId?: string | number;
};

/**
 * Live activity feed over WebSocket with:
 *  - exponential-backoff reconnect (capped),
 *  - a `since`/last-seq REST backfill on (re)connect so the living report
 *    never develops holes across a dropped socket,
 *  - per-section "new results" bumping via the research store.
 */
export function useActivityFeed({
  maxEvents = 100,
  backfill = true,
  companyId,
}: Options = {}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  // REST polling keeps the feed live even when the WebSocket can't reach Reverb
  // (e.g. behind a front nginx without a WS upgrade route) — this is the
  // reliable live path on production.
  const [restLive, setRestLive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);
  const lastSeq = useRef(0);
  const closedByUs = useRef(false);

  const setWsConnected = useResearchStore((s) => s.setWsConnected);
  const bumpSection = useResearchStore((s) => s.bumpSection);
  const setLastSeq = useResearchStore((s) => s.setLastSeq);

  const ingest = useCallback(
    (incoming: ActivityEvent[]) => {
      if (incoming.length === 0) return;
      for (const ev of incoming) {
        if (ev.id > lastSeq.current) lastSeq.current = ev.id;
        if (ev.section) bumpSection(ev.section, 1);
      }
      setLastSeq(lastSeq.current);
      setEvents((prev) => {
        // De-dupe by id, newest first.
        const seen = new Set(prev.map((e) => e.id));
        const fresh = incoming.filter((e) => !seen.has(e.id));
        return [...fresh, ...prev].slice(0, maxEvents);
      });
    },
    [bumpSection, maxEvents, setLastSeq],
  );

  const doBackfill = useCallback(async () => {
    if (!backfill || lastSeq.current === 0) return;
    try {
      const missed = await cytapi.activitySince(lastSeq.current, companyId);
      // Server returns ascending; ingest so higher ids win.
      ingest(missed);
    } catch {
      // Backend may not implement backfill yet — fail soft.
    }
  }, [backfill, companyId, ingest]);

  /**
   * Poll for new events since the last seen id. The initial call (lastSeq 0)
   * loads the recent feed; subsequent calls only pull the delta. This drives
   * the live feed AND the per-section "new" badges without a WebSocket.
   */
  const poll = useCallback(async () => {
    try {
      const missed = await cytapi.activitySince(lastSeq.current, companyId);
      ingest(missed);
      setRestLive(true);
    } catch {
      setRestLive(false);
    }
  }, [companyId, ingest]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_URL}/ws/activity`);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      attempts.current = 0;
      setConnected(true);
      setWsConnected(true);
      void doBackfill();
    };

    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as ActivityEvent | ActivityEvent[];
        ingest(Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setWsConnected(false);
      if (!closedByUs.current) scheduleReconnect();
    };

    ws.onerror = () => ws.close();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    function scheduleReconnect() {
      attempts.current += 1;
      // 1s, 2s, 4s … capped at 30s.
      const delay = Math.min(1000 * 2 ** (attempts.current - 1), 30000);
      reconnectTimer.current = setTimeout(connect, delay);
    }
  }, [doBackfill, ingest, setWsConnected]);

  // Switching topics: drop the prior topic's events and reset the cursor so the
  // next poll reloads this topic's feed from scratch.
  useEffect(() => {
    lastSeq.current = 0;
    setEvents([]);
  }, [companyId]);

  useEffect(() => {
    closedByUs.current = false;
    connect();
    // Reliable live path: initial load + delta polling (every 4s).
    void poll();
    pollTimer.current = setInterval(() => void poll(), 4000);
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      wsRef.current?.close();
    };
  }, [connect, poll]);

  // "Live" if either transport is delivering events.
  return { events, connected: connected || restLive };
}
