# SOW: Product docs as the agents' source of truth

| Field | Value |
| --- | --- |
| Date started | 2026-11-12 |
| Requested by | Tracy (TracerFx123) |
| Performed by | Claude (ChooseYourTopic project thread) |
| Queue row | none — new request |
| Repos | both (CYTWeb leads) |
| Branch | `docs/product-source-of-truth` |
| PR(s) | CYTWeb and CYTAPI PRs on this branch |
| Status | In review |

## Goal

"ChooseYourTopic should now have a Features List, Roadmap, Feature enhancements queue and a
repository of scope of work history provided to agents performing tasks that use GitHub as the
source of truth via CYTWeb and CYTAPI as the RESTful data API for app development."

## In scope

- CYTWeb `docs/product/`: README, FEATURES, ROADMAP, ENHANCEMENT_QUEUE (product-wide, canonical).
- CYTWeb + CYTAPI `docs/scope-of-work/`: README, TEMPLATE, INDEX back-filled from merged PRs.
- CYTAPI `docs/product/`: README pointing to CYTWeb + API_FEATURES (endpoint groups, enforcement).
- `AGENTS.md` and `CLAUDE.md` at both repo roots telling agents to read and maintain these.

## Out of scope

- Any code change. Syncing the in-app roadmap ledger from these docs (queued as Q-021).

## Approach

Features List from a walk of every CYTWeb page/component, checked against CYTAPI routes,
controllers, `User::entitlements()` and the Stripe tier config. Queue seeded from the gaps found
plus open items in CYTAPI `docs/feature-backlog.md`. History back-filled from `git log --merges`.

## Acceptance

- [ ] Both PRs contain only Markdown under `docs/` plus `AGENTS.md` / `CLAUDE.md`.
- [ ] Links between the two repos resolve once both PRs merge.

## Outcome (fill in at merge)
