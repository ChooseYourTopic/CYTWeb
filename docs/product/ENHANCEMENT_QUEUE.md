# ChooseYourTopic — Feature Enhancement Queue

_The priority-ordered work queue for both repos. Seeded 2026-11-12 from the Features List
review (CYTWeb + CYTAPI) and the open items in CYTAPI `docs/feature-backlog.md`._

## How the queue works

- **One row per enhancement**, with a stable id (`Q-###`). Never reuse an id.
- **Priority:** P1 = next up / risk, P2 = soon, P3 = when capacity allows, P4 = idea.
- **Status:** `Proposed` → `Queued` → `In progress` → `In review` → `Shipped` (or `Blocked`, `Dropped`).
  `Proposed` and `Needs decision` rows wait for the owner before work starts.
- **Layer:** `WEB` (CYTWeb), `API` (CYTAPI), `BOTH`, or `NEW` (a new repo/app).
- An agent picking up a row sets it to `In progress`, adds the SOW file name, and opens a PR.
  On merge the row becomes `Shipped` with the PR link(s); move it to the Shipped table.
- New ideas go in as `Proposed` at the bottom of their priority band.

## Open

| ID | Enhancement | Layer | Priority | Status | Depends on | SOW / PR |
| --- | --- | --- | --- | --- | --- | --- |
| Q-001 | Topic-header Basic/Standard/Expert switch must respect the Expert license (Settings already does) | WEB | P1 | Queued | Q-002 | |
| Q-002 | API enforces Expert: reject `view_mode=advanced` in `PUT /me/preferences` and 403 Expert-only modules (Outreach, Ads, Build, Finance, Decisions) for non-Expert owners | API | P1 | Queued | | |
| Q-003 | One plan catalog: reconcile web pricing (Explorer $29 / Builder $49 / Scale $59) with Stripe tiers (Starter $29 / Pro $59 + $5 task packs) | BOTH | P1 | Needs decision | | |
| Q-004 | Enforce plan allowances (nightly task allowance, company count, task packs) in the agent cycle | API | P1 | Queued | Q-003 | |
| Q-005 | Remove the committed `NEXT_PUBLIC_API_KEY` from `.env.production` in the public repo and rotate the key | WEB | P1 | Queued | | |
| Q-006 | Billing UI: current plan, change tier, buy task packs, charges, Stripe billing portal (API `/subscription/*` exists) | WEB | P2 | Queued | Q-003 | |
| Q-007 | Database: confirm MySQL 8 (current docs/config) vs PostgreSQL target; plan migration if Postgres | API | P2 | Needs decision | | |
| Q-008 | Flutter mobile app on Firebase project `chooseyourtopic-6f5a7`, consuming CYTAPI | NEW | P2 | Proposed | Q-003 | |
| Q-009 | Media tab: wire generation to the agent engine (37 project types) | BOTH | P2 | Queued | | |
| Q-010 | Context tab: document uploads (briefs, brand guides, research) | BOTH | P2 | Queued | | |
| Q-011 | Security tab: real sessions list, audit log, sandbox go-live toggle | BOTH | P2 | Queued | | |
| Q-012 | Automations tab: persist toggles and run the 5 rules | BOTH | P2 | Queued | | |
| Q-013 | Decisions tab: scope the task list to the open topic | BOTH | P2 | Queued | | |
| Q-014 | Network tab: webhooks, API access, custom domains, team access | BOTH | P3 | Queued | | |
| Q-015 | Integrations: enable "Rotate token" (API `/integrations/{provider}/rotate` exists) | WEB | P3 | Queued | | |
| Q-016 | Agent detail: verify add-skill / add-loop against the live API endpoints; drop the "isn't available yet" copy | WEB | P3 | Queued | | |
| Q-017 | Persist "How your agents run" server-side (API already accepts `connection_mode`) | WEB | P3 | Queued | | |
| Q-018 | Voices UI: list voices, default voice, speak (API endpoints exist) | WEB | P3 | Queued | | |
| Q-019 | Email magic-link sign-in on the web (API endpoints exist) | WEB | P3 | Queued | | |
| Q-020 | Support tab roadmap/release notes from the API instead of hard-coded arrays | BOTH | P3 | Queued | Q-021 | |
| Q-021 | Sync the in-app roadmap ledger (`/roadmap`, `src/data/roadmap.json`) from these GitHub docs | BOTH | P3 | Proposed | | |
| Q-022 | More model adapters: Llama, Mistral, DeepSeek, Cohere | API | P3 | Queued | | |
| Q-023 | Unified ticketing spine: feature/support/access channels, review gate (CYTAPI `docs/dependency-gated-sequencing-roadmap.md`) | API | P3 | Proposed (verify what shipped) | | |
| Q-024 | OAuth connect for Claude accounts | BOTH | P4 | Blocked (not offered by Anthropic) | | |
| Q-025 | Unreal Engine MCP as a project build type (CYTAPI `docs/feature-backlog.md`) | API | P4 | Proposed | | |

## Shipped

| ID | Enhancement | Shipped | PR(s) |
| --- | --- | --- | --- |
| — | History before this queue existed lives in [../scope-of-work/INDEX.md](../scope-of-work/INDEX.md) | | |
