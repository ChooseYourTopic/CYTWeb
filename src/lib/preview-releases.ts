import { promises as fs } from "fs";
import path from "path";
import fallbackData from "@/data/preview-releases.json";

// ---------------------------------------------------------------------------
// Change-Approval Board data model for the internal Winslow build log at
// /preview/releases.
//
// FORMAT LOCKED (Tracy 2026-09-24): every board entry is exactly
//   (1) date · (2) short description of the change · (3) link to any knowledge
//   article(s) about the change (nullable when no article exists yet).
// A lighter applied-changelog — no version / highlights / notes columns. This
// is the ORCHESTRATION build-milestone board (shipped chunks, newest first),
// distinct from the customer-facing product release notes at /releases (which
// is API-backed) and coexisting under /preview/* with the /preview/status board.
//
// In production the orchestrator (Winslow) keeps a live file on the box at
// RELEASES_DATA_PATH (mounted into the CYTWeb container, e.g.
// /data/preview-releases.json ← /opt/cytweb-data/preview-releases.json) and
// APPENDS one entry at each launch. /preview/releases reads it at REQUEST time
// (force-dynamic, no cache), so editing that JSON on the box is reflected
// instantly with NO redeploy. If the box file is missing/unreadable, the
// committed src/data/preview-releases.json bundled here is used so the page
// always renders.
// ---------------------------------------------------------------------------

/** A knowledge-base / FAQ article the change is documented in. */
export type KbLink = {
  /** Absolute or site-relative URL of the article. */
  url: string;
  /** Human label for the link; defaults to "Learn more" when omitted. */
  label?: string;
};

export type Release = {
  /** ISO date (YYYY-MM-DD) the change was applied / went live. */
  date: string;
  /** Short human description of the change — the board's one-line summary. */
  description: string;
  /**
   * Link to any knowledge article(s) about the change. Nullable/optional — set
   * to null (or omit) when no article exists yet.
   */
  kbLink?: KbLink | null;
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
 * Load the change-approval board at request time. Tries RELEASES_DATA_PATH
 * (default /data/preview-releases.json inside the container), then falls back
 * to the bundled src/data/preview-releases.json. Never throws — a bad/missing
 * file degrades to the committed fallback so the board is never blank.
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

/** Entries sorted newest-first (by date desc). */
export function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return 0;
  });
}
