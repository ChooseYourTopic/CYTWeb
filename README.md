# CYTWeb — ChooseYourTopic living research dashboard

The production web frontend for **ChooseYourTopic**: enter one line to start a
topic, then stay in a **living dashboard** whose panels fill in progressively as
a swarm of background agents produce findings. Talks to the **CYTAPI** backend.

- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind (CSS-var tokens) ·
  zustand · recharts · lucide-react.
- **Clean-room:** every line is original; no third-party (Polsia) code is used.

## What's inside

| Area | Path |
|---|---|
| Typed API client + contract types | `src/lib/api.ts` |
| Branding + palette tokens | `src/lib/brand.ts`, `src/app/globals.css` |
| Live hooks | `src/hooks/useActivityFeed.ts` (WS + backoff reconnect + `since` backfill), `src/hooks/useAgentStatus.ts` (poll), `src/hooks/useSectionData.ts` (polled section + WS-triggered refetch) |
| Client store | `src/store/useResearchStore.ts` (active tab, WS state, per-section "new" counts, last-seq) |
| Landing / topic entry | `src/app/page.tsx`, `src/components/onboarding/TopicHeroInput.tsx` |
| Living dashboard | `src/app/topic/[id]/page.tsx`, `src/components/research/*` |

### The living dashboard

- **KPI tiles** — tasks, findings, active agents, capped spend.
- **Tabbed report canvas** — Overview / Competitors / Market / Drafts /
  Decisions / Report, each a `ProgressiveCard` (summary → expand to a dialog).
- **Per-tab "new results" badges** — WS findings buffer in the store and badge
  off-screen tabs instead of scroll-jacking; the count flushes on click.
- **Always-on investigation rail** — the live activity feed (transparent process
  view) + a compact agent-status grid.
- **Fail-soft** — every panel renders skeletons / "agents are working…" states
  when the backend is down, so a cold topic looks like a report being written.

## Local development

```bash
npm install
cp .env.example .env.local   # point at your CYTAPI
npm run dev                  # http://localhost:3000
```

### Environment

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | CYTAPI origin; client calls `${API_URL}/api/v1` with `X-API-Key`. |
| `NEXT_PUBLIC_WS_URL` | WebSocket origin; connects to `${WS_URL}/ws/activity`. Use `wss://` in prod. |
| `NEXT_PUBLIC_API_KEY` | `X-API-Key` header value. |

> `NEXT_PUBLIC_*` are inlined at **build time** — set them before `npm run build`
> or as Docker `--build-arg`s.

## Build & test

```bash
npm run build   # must succeed (standalone output)
npm test        # jest + RTL component tests (feed + progressive card)
```

## Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.chooseyourtopic.com \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.chooseyourtopic.com \
  --build-arg NEXT_PUBLIC_API_KEY=your-key \
  -t cytweb:latest .

docker run -p 3000:3000 cytweb:latest
```

Produces a Next.js **standalone** image (node server on `:3000`) that fits a
compose stack behind nginx alongside CYTAPI.

## Deploy (droplet `chooseyourtopic-1`, `/opt/cytweb`)

```bash
ssh root@45.55.81.216 'cd /opt/cytweb && git pull && docker compose up -d --build cytweb'
```

Empire git SOP: `main` is source of truth; deploy = pull + rebuild, never scp.

## Known gaps

- **Additive topic endpoints are proposed, not yet confirmed** by CYTAPI:
  `POST /onboarding/topic`, `GET /topic/{id}/overview|competitors|market|drafts`,
  `GET /reports`, `GET /activity?since=`. The client calls them and fails soft
  (skeletons/placeholders) until the backend implements them. Existing contract
  endpoints (`/dashboard/summary`, `/agents/status`, `/tasks`, `/finance/summary`,
  `/ws/activity`) match the observed CYTAPI shapes.
- **Auth is API-key only** (magic-link/session onboarding from the PRD is not yet
  wired; the landing page seeds a topic directly).
- **`compose`/nginx files live in the CYTAPI/infra repo**, not here; this repo
  ships the `Dockerfile` and expects to be composed alongside the API.
- No real backend was running during the build, so live data paths were verified
  against the typed contract and fail-soft states, not an end-to-end socket.
