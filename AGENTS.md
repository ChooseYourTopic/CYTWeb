# Agent guide — CYTWeb

CYTWeb is the ChooseYourTopic web app (Next.js 14, TypeScript, Tailwind, zustand): the UI/UX.
All data comes from **CYTAPI** ([ChooseYourTopic/CYTAPI](https://github.com/ChooseYourTopic/CYTAPI)),
the Laravel REST API that also serves the planned Flutter app. **GitHub `main` is the source of truth.**

## Read before any task

1. [docs/product/README.md](docs/product/README.md) — how the product docs fit together.
2. [docs/product/FEATURES.md](docs/product/FEATURES.md) — what exists today.
3. Your row in [docs/product/ENHANCEMENT_QUEUE.md](docs/product/ENHANCEMENT_QUEUE.md) and the
   theme in [docs/product/ROADMAP.md](docs/product/ROADMAP.md).
4. Related past work in [docs/scope-of-work/INDEX.md](docs/scope-of-work/INDEX.md) **and** CYTAPI's
   `docs/scope-of-work/INDEX.md`.

## Always check both layers

For any feature, gating or behaviour question, look at the CYTWeb pages/components **and** the
CYTAPI routes, controllers and migrations. The UI alone does not show what is enforced.

## How to work

1. Write a SOW from [docs/scope-of-work/TEMPLATE.md](docs/scope-of-work/TEMPLATE.md); set the queue row to `In progress`.
2. Branch off current `main`, build, run `npm run build` and `npm test`, open a PR.
3. In the same PR: SOW outcome, a row in the SOW INDEX, the queue row's status, and
   `FEATURES.md` if user-visible behaviour changed.
4. Never commit secrets. `NEXT_PUBLIC_*` values are public by design; real keys belong in the deploy environment.
