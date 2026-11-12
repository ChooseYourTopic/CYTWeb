# ChooseYourTopic — Roadmap

_As of 2026-11-12. Themes and milestones ahead; each line points at queue rows in
[ENHANCEMENT_QUEUE.md](ENHANCEMENT_QUEUE.md). Dates are set by the owner; an agent never invents one._

**Product goal:** business users learn how to bring AI into their business by handing an idea and
context to an agent swarm that runs it while they watch, steer and approve.

## Now — make licensing and billing real

The Expert license and the paid plans exist on paper but are not enforced, and two price lists disagree.

- Enforce the Expert license in the web and the API (Q-001, Q-002).
- Decide one plan catalog, then enforce its allowances and ship the billing UI (Q-003, Q-004, Q-006).
- Close the exposed API key in the public CYTWeb repo (Q-005).
- Decide the database target, MySQL 8 or PostgreSQL (Q-007).

**Done when:** a Standard user cannot reach Expert tabs, a paying user sees and manages their plan,
and the agent cycle respects the plan's allowances.

## Next — finish the half-built tabs

- Media generation, Context document uploads (Q-009, Q-010).
- Security, Automations and Decisions become real (Q-011, Q-012, Q-013).
- Surface API features the web skips: rotate token, skills/loops, connection mode, voices, magic link
  (Q-015 to Q-019).

**Done when:** no tab in the Expert view is a static placeholder.

## Next — mobile app

- Flutter app on Firebase project `chooseyourtopic-6f5a7`, using CYTAPI as its REST data API (Q-008).
- Start from the Basic view's 10 tabs; reuse the same license and plan rules as the web.

## Later

- Network tab (Q-014), more model adapters (Q-022), unified ticketing spine (Q-023).
- One roadmap feed: the in-app roadmap and Support-tab notes read from these docs (Q-020, Q-021).
- OAuth for Claude when Anthropic offers it (Q-024); Unreal Engine MCP build type (Q-025).
