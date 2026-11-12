# Scope-of-work history

Every task an agent (or person) performs on this repo gets a **scope-of-work (SOW) file**,
written **before** the work starts and closed out when the PR merges. Together they are the
repository's memory: the next agent reads them instead of re-deriving past decisions.

- **One file per task:** `YYYY-MM-DD-short-slug.md` in this folder, from [TEMPLATE.md](TEMPLATE.md).
- **One row per task** in [INDEX.md](INDEX.md), newest first.
- The SOW, the INDEX row and the queue status change ship **in the same PR** as the work.
- Cross-repo work: write the SOW in the repo that leads, and link it from the other repo's INDEX.

## Before you start a task, read

1. [../product/FEATURES.md](../product/FEATURES.md) — what exists today.
2. Your row in [../product/ENHANCEMENT_QUEUE.md](../product/ENHANCEMENT_QUEUE.md).
3. Related rows in this INDEX **and** in the other repo's `docs/scope-of-work/INDEX.md`
   (CYTWeb ↔ CYTAPI), plus the PRs they link.

Rows dated before 2026-11-12 were back-filled from merged PRs; their PR description is the SOW.
