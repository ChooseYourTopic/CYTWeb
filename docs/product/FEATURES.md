# ChooseYourTopic — Features List

_As of 2026-11-12 · CYTWeb `55ef83c` (2026-09-25) · CYTAPI `e51548d` (2026-09-30)_

ChooseYourTopic helps business users learn how to bring AI into their business. A user
gives an idea and some context, and a swarm of AI agents does the rest while the user
watches, steers and approves.

**State** legend: **Live** = UI built and wired to a real CYTAPI endpoint ·
**Partial** = some of it is wired · **Placeholder** = static UI, nothing runs.

## Licenses and views

| License | Who | Unlocks |
| --- | --- | --- |
| Standard | Default business owner | Basic and Standard views, every account page |
| Expert | Fully licensed owner | Everything above, plus the Expert view (all 24 tabs) |
| Support | Staff | Admin portal support queue, license access console |
| Admin | Staff | Full admin portal, including role and license changes |

| View | Tabs shown |
| --- | --- |
| Basic | 10: Overview, NEXT, Report, Team, Status, Invoicing, Support, Media, Impact Pass, Services |
| Standard | 16: Overview, NEXT, Impact Pass, Context, Integrations, Models, Status, Team, Competitors, Market, Drafts, Report, Automations, Network, Security, Media |
| Expert | All 24 |

Known gap: the Expert license is not actually enforced (see Q-001, Q-002 in the queue).

## Getting started

| Page | What the user can do | State |
| --- | --- | --- |
| Landing `/` | Type or dictate one idea; "Surprise me" ideas by category | Live |
| Sign in `/signin` | Phone + texted 6-digit code (primary), or email/username + password; staff pick a "door" (user, support desk, admin portal) | Live |
| Onboarding `/start` | AI familiarity gate (New to AI / Veteran). New-to-AI: Learn, Invent, Design, Run intents. Veteran: business experience, idea vs. plan, website, social platform + handle, focus (Invent, Organize, Plan, Implement, Fund Business) | Live |
| Idea picker `/choose` | Type a topic or tap a curated idea | Live |
| My topics `/dashboard` | All owned + shared topics with review status, task counts, findings, last activity; pause/resume; start a new topic | Live |

Voice input (browser speech-to-text) is available in nearly every text box.

## The topic dashboard `/topic/{id}`

Nine stock agents led by the orchestrator, Winslow: Orchestrator (CEO), Business planning,
Competitor research, Social media, Email outreach, Customer support, Ads management,
Finance, Code generation. Optional agents (e.g. Winslow Prime) can be added.

- **Header:** Live/Preview badge, Pause/Resume project, Basic/Standard/Expert switch, license line.
- **KPI tiles** (each drills down): Tasks today, Findings, Agents active, Est. spend.
- **Right rail:** Start now (activate Winslow), Roadmap (`/topic/{id}/roadmap`: add, reprioritize,
  assign to an agent, move Queued → In progress → In review → Shipped/Archived), Tickets, Cycle
  day/phase, live activity feed (full log `/topic/{id}/activity`), agent status grid.
- **Agent detail:** role, model, skills, loops, queue, run history, profile version; Run now (with an
  optional prompt); realign prompt / revert; ask Winslow to prioritize; add context; add skills/loops.
- Any "run an agent" control is disabled until a model is connected (API key or XTKRecall add-on).

## Dashboard tabs

| Tab | What the user can do | Views | State |
| --- | --- | --- | --- |
| Overview | Effort presets that set the daily spend cap and start work ($5 / $20 / $50 / $150); status signal; recommended next steps; Cue Winslow; business profile; value proposition + channel earnings projection; achievements; plan board (5 badge deliverables); trophy shelf; daily/weekly/monthly challenges | B S E | Live (projection is illustrative) |
| NEXT | Current next step + recommended carry-overs; add a next step by text or voice | B S E | Live |
| Impact Pass | 29-day season, streak, weekly/monthly XP tracks, tier rewards, milestone badges | B S E | Live |
| Context | Context survey; voice → structured context; Winslow follow-up questions; rough valuation | S E | Partial (document uploads "coming next") |
| Integrations | Connect/update/disconnect 14 services by key (Twilio, Supabase, DigitalOcean, Stripe, SendGrid, GitHub, X, Google Ads, Meta Ads, Slack, Voices TTS, ElevenLabs, Lead Interlink, Salesforce); XTKRecall MCP subscription; Claude Code ops-MCP token | S E | Live (rotate-token button disabled) |
| Models | Claude key register/test/replace/remove; OpenAI, Grok, Gemini keys; fallback ladder; per-provider usage; tag a key to a platform | S E | Live (Llama, Mistral, DeepSeek, Cohere "coming soon") |
| Status | Traffic-light monitor of Winslow + each agent | B S E | Live |
| Team | Winslow check-in, run a check-in, add/remove optional agents, agent record | B S E | Live |
| Competitors | Competitor profiles with full teardowns | S E | Live |
| Market | Market signals and demand trends | S E | Live |
| Drafts | Landing copy, social posts, outreach drafts; publish on approval | S E | Live |
| Outreach | Email campaigns, prospect segments, drafts; send on approval | E | Live |
| Support | Support agent inbox + drafted replies; roadmap/release notes | B E | Live (notes hard-coded) |
| Ads | Lead Interlink campaigns, Salesforce leads, push context, draft campaigns with Launch | E | Live ("Simulated" until keys connected) |
| Build | Feature specs + changelog from the code-generation agent | E | Live |
| Finance | P&L, analysis, capped AI spend, trend | E | Live |
| Decisions | Approve/reject pending tasks | E | Live (lists account tasks, not this topic's) |
| Report | Daily reports (morning plan, evening summary) | B S E | Live |
| Automations | 5 toggles (auto-publish, digest, low-budget alert, FAQ auto-answer, competitor recheck) | S E | Placeholder |
| Network | Webhooks, API access, domains, team access, partner links | S E | Placeholder |
| Security | Sandbox mode, credentials, sessions, privacy, audit log | S E | Placeholder |
| Media | Idea → recommended media projects; browse 37 types in 8 groups | B S E | Partial (no generation yet) |
| Invoicing | Outstanding vs paid, invoice list, create, mark paid | B E | Live ("Simulated" until processor key) |
| Services | Request professional services (general, tax, legal, advertising, training); one-click subscribe | B E | Live |

## Account-level pages

| Page | What the user can do | State |
| --- | --- | --- |
| Settings: Profile, Refer & grow, Password, Two-factor | Name/nickname, ids, license; affiliate link + QR; password; authenticator 2FA + recovery codes | Live |
| Settings: Preferences | Timezone, daily spend cap per company (default $25), default view | Live |
| Settings: How your agents run | Server-side on own Anthropic key, or own Claude Code subscription locally ($0 platform cost); OAuth disabled | Partial (choice stored in browser only) |
| Settings: AI models, API Access (Empire Bridge), Collaborators | Provider keys; read-only bridge keys with history + per-key activity; per-tab collaborator grants (2FA step-up) | Live |
| Integrations `/integrations` | Partner-app directory (QuickerBiz, ResyBlack, Collect2Play, SloppyCards, Tracercoin) with setup + bridge key | Live |
| Partners `/partners`, Refer `/refer` | Affiliate registration + credited referrals; full-screen QR share | Live |
| Leaderboard `/leaderboard` | 29-day business race; rank by speed, milestones, views, clicks, conversions; filters; opt-in per topic | Live |
| Support `/support` | Open, track and reply to tickets | Live |
| Roadmap / Releases `/roadmap`, `/releases` | Product roadmap and shipped notes | Live |
| Pricing `/pricing` | Explorer $29 / Builder $49 / Scale $59 (indicative) | Placeholder (no checkout; differs from API tiers) |
| Admin `/admin` (staff only) | Support queue, overview, users, companies, license access, activity | Live |

## Built in CYTAPI but not surfaced in CYTWeb

Subscription management (`/subscription/*`), voices + speech synthesis, integration token
rotate, email magic-link sign-in, topic/Winslow loops, external mode, memory, moods,
portfolio. See CYTAPI `docs/product/API_FEATURES.md`.
