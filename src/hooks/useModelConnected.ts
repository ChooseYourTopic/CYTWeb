"use client";

import { useEffect, useState } from "react";
import { cytapi } from "@/lib/api";

/**
 * Resolves whether the signed-in user has a usable model connected — the gate on
 * running any agent (E6). A model counts as connected when EITHER:
 *   - the user's own AI credential is connected (API key OR OAuth account) —
 *     `cytapi.aiCredential.get().connected`, per-user; OR
 *   - the topic carries the XTKRecall MCP entitlement —
 *     `cytapi.xtkrecall.status(topicId).entitled` (per-user grain, but the status
 *     endpoint is addressed per topic).
 *
 * Fail-safe: while loading, or when BOTH lookups error out, we DON'T hard-block —
 * `blocked` only turns true once we KNOW there is no usable model (a definitive
 * "not connected" answer). This avoids false negatives that would wrongly disable
 * a user who actually has a model connected.
 *
 * The paired BACKEND enforcement guard (CYTAPI) is a separate correlated build —
 * this hook only powers the front-end affordance.
 */
export function useModelConnected(topicId?: string | number) {
  const [connected, setConnected] = useState(false);
  // Whether we have a definitive answer (either source resolved, not just errored).
  const [known, setKnown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // `true`/`false` = a definitive answer; `null` = no signal (errored, or the
    // XTKRecall status can't be queried without a topic).
    const credP: Promise<boolean | null> = cytapi.aiCredential
      .get()
      .then((c) => c.connected === true)
      .catch(() => null);
    const xtkP: Promise<boolean | null> = topicId
      ? cytapi.xtkrecall
          .status(topicId)
          .then((s) => s.entitled === true)
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([credP, xtkP]).then(([cred, xtk]) => {
      if (cancelled) return;
      const isConnected = cred === true || xtk === true;
      // Known only if at least one source gave a real answer.
      const isKnown = cred !== null || xtk !== null;
      setConnected(isConnected);
      setKnown(isKnown);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [topicId]);

  // Only gate once we know, for certain, that no usable model is connected.
  const blocked = known && !connected;
  return { connected, loading, blocked };
}
