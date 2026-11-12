# ChooseYourTopic — product docs (source of truth)

ChooseYourTopic helps business users learn how to bring AI into their business.
A user gives an idea and some context, and a swarm of AI agents does the rest
while the user watches, steers and approves.

These files are the **single source of truth** for what the product does, where
it is going, and what has been built. GitHub `main` wins over any other copy
(chat notes, local folders, the in-app roadmap ledger, Claude memory).

| File | What it holds | Who updates it |
| --- | --- | --- |
| [FEATURES.md](FEATURES.md) | Every feature a user can reach today, by page and tab, with its state | Whoever ships or changes a feature, in the same PR |
| [ROADMAP.md](ROADMAP.md) | Themes and milestones ahead (Now / Next / Later) | Product owner (Tracy); agents propose via PR |
| [ENHANCEMENT_QUEUE.md](ENHANCEMENT_QUEUE.md) | The priority-ordered work queue, one row per enhancement | Agents move status as they work; owner sets priority |
| [../scope-of-work/](../scope-of-work/) | One scope-of-work (SOW) file per task, plus the history index | The agent doing the task |

## Two repos, one product

| Repo | Role | Docs it holds |
| --- | --- | --- |
| [ChooseYourTopic/CYTWeb](https://github.com/ChooseYourTopic/CYTWeb) | Next.js web app — the UI/UX | **Product-wide** Features, Roadmap, Enhancement Queue (this folder) + CYTWeb SOW history |
| [ChooseYourTopic/CYTAPI](https://github.com/ChooseYourTopic/CYTAPI) | Laravel REST API + agent engine — the data API for every client (web, and the planned Flutter app) | API capability list (`docs/product/API_FEATURES.md`) + CYTAPI SOW history |

The product-wide files live only here so they never drift. CYTAPI links back to them.

## Rules for agents

1. Before starting a task, read `FEATURES.md`, find your row in `ENHANCEMENT_QUEUE.md`,
   and read the SOW history for related past work in **both** repos.
2. Every task touches both layers in thought: check the CYTWeb UI/UX **and** the
   CYTAPI endpoints, controllers and migrations before concluding anything.
3. Write the SOW file first (see [../scope-of-work/README.md](../scope-of-work/README.md)),
   then work on a branch off `main`, then open a PR.
4. In the same PR: update the queue row's status, add a row to the SOW index, and
   update `FEATURES.md` if user-visible behaviour changed.
