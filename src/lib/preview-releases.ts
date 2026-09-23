import { promises as fs } from "fs";
import path from "path";
import fallbackData from "@/data/preview-releases.json";

// ---------------------------------------------------------------------------
// Release-notes data model for the internal Winslow build log at
// /preview/releases.
//
// This is the ORCHESTRATION build-milestone log (shipped chunks, newest first),
// distinct from the customer-facing product release notes at /releases (which
// is API-backed). Same live-update mechanism as the /preview/status board.
//
// In production the orchestrator (Winslow) keeps a live file on the box at
// RELEASES_DATA_PATH (mounted into the CYTWeb container, e.g.
// /data/preview-releases.json ← /opt/cytweb-data/preview-releases.json).
// /preview/releases reads it at REQUEST time (force-dynamic, no cache), so
// editing that JSON on the box is reflected instantly with NO redeploy. If the
// box file is missing/unreadable, the committed src/data/preview-releases.json
// bundled here is used so the page always renders.
// ---------------------------------------------------------------------------

export type Release = {
  /** ISO date (YYYY-MM-DD) the release shipped. */
  date: string;
  /** Semver-ish version tag, e.g. "0.4.0". */
  version: string;
  /** Short human title for the release. */
  title: string;
  /** Bullet highlights — the headline changes. */
  highlights: string[];
  /** Optional longer prose shown under the highlights. */
  notes?: string;
};

export type ReleaseNotes = {
  /** ISO timestamp the orchestrator stamps whenever it edits the file. */
  updatedAt: string;
  project?: string;
  releases: Release[];
  /** Set by the loader (not stored): where the data was read from. */
  source?: "file" | "bundled-fallback";
};

const DEFAULT_PATH = "/data/preview-releases.json";

/**
 * Load the release notes at request time. Tries RELEASES_DATA_PATH (default
 * /data/preview-releases.json inside the container), then falls back to the
 * bundled src/data/preview-releases.json. Never throws.
 */
export async function loadReleases(): Promise<ReleaseNotes> {
  const filePath = process.env.RELEASES_DATA_PATH || DEFAULT_PATH;
  try {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const raw = await fs.readFile(resolved, "utf8");
    const parsed = JSON.parse(raw) as ReleaseNotes;
    if (!parsed || !Array.isArray(parsed.releases)) {
      throw new Error("preview-releases.json missing required `releases` array");
    }
    return { ...parsed, source: "file" };
  } catch {
    return { ...(fallbackData as ReleaseNotes), source: "bundled-fallback" };
  }
}

/** Releases sorted newest-first (by date desc, then version desc as a tiebreak). */
export function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.version < b.version ? 1 : -1;
  });
}
