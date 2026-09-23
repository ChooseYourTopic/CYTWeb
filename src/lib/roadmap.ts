import { promises as fs } from "fs";
import path from "path";
import fallbackData from "@/data/roadmap.json";

// ---------------------------------------------------------------------------
// Roadmap data model for the internal Winslow status board at /preview/status.
//
// This is the ORCHESTRATION status board (build queue + enhancement backlog +
// three-way reconcile watermark) — distinct from the customer-facing product
// roadmap at /roadmap (which is API-backed). It coexists under /preview/* with
// the product-story /preview page.
//
// In production the orchestrator (Winslow) keeps a live file on the box at
// ROADMAP_DATA_PATH (mounted into the CYTWeb container, e.g. /data/roadmap.json
// ← /opt/cytweb-data/roadmap.json). /preview/status reads it at REQUEST time
// (force-dynamic, no cache), so editing that JSON on the box is reflected
// instantly with NO redeploy. If the box file is missing/unreadable, the
// committed src/data/roadmap.json bundled here is used so the page always renders.
// ---------------------------------------------------------------------------

export type StatusItem = {
  title: string;
  detail?: string;
  /** For "waiting" items: what unblocks this. */
  waitsOn?: string;
  /** Optional short ref/commit tag surfaced as a chip (e.g. "f622f61"). */
  ref?: string;
};

export type QueueState = "done" | "in-progress" | "queued";

export type QueueItem = {
  key: string;
  title: string;
  state: QueueState;
  detail?: string;
};

export type EnhancementKind = "backlog" | "decision";

export type Enhancement = {
  title: string;
  detail?: string;
  /** "decision" items are open questions awaiting an owner decision. */
  kind?: EnhancementKind;
};

// The three-way reconcile watermark (box HEAD → GitHub main → local). Winslow
// stamps this each pass so the board doubles as a working/continuity surface.
export type Reconcile = {
  /** SHAs acknowledged as reconciled across box/GitHub/local. */
  acked?: string[];
  /** ISO timestamp of the last reconcile pass. */
  lastReconciled?: string;
  /** Monotonic reconcile-pass counter. */
  sequence?: number;
};

export type Roadmap = {
  /** ISO timestamp the orchestrator stamps whenever it edits the file. */
  updatedAt: string;
  project?: string;
  headline?: string;
  note?: string;
  reconcile?: Reconcile;
  status: {
    live: StatusItem[];
    inProgress: StatusItem[];
    waiting: StatusItem[];
  };
  queue: QueueItem[];
  enhancements: Enhancement[];
  /** Set by the loader (not stored): where the data was read from. */
  source?: "file" | "bundled-fallback";
};

const DEFAULT_PATH = "/data/roadmap.json";

/**
 * Load the roadmap at request time. Tries ROADMAP_DATA_PATH (default
 * /data/roadmap.json inside the container), then falls back to the bundled
 * src/data/roadmap.json. Never throws — a bad/missing file degrades to the
 * committed fallback so the board is never blank.
 */
export async function loadRoadmap(): Promise<Roadmap> {
  const filePath = process.env.ROADMAP_DATA_PATH || DEFAULT_PATH;
  try {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const raw = await fs.readFile(resolved, "utf8");
    const parsed = JSON.parse(raw) as Roadmap;
    if (!parsed || !parsed.status || !parsed.queue) {
      throw new Error("roadmap.json missing required top-level keys");
    }
    return { ...parsed, source: "file" };
  } catch {
    // Missing box file (common before the first orchestrator write) or malformed
    // JSON — render the committed snapshot so /preview/status is never blank.
    return { ...(fallbackData as Roadmap), source: "bundled-fallback" };
  }
}
