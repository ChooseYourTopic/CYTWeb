// Typed CYTAPI client (clean-room). Talks to ${NEXT_PUBLIC_API_URL}/api/v1 with
// an X-API-Key header. Every helper is fail-soft friendly: callers wrap in
// try/catch and fall back to skeletons when the backend is not up.

import { getRef } from "./ref";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// A single in-flight refresh shared by all callers, so a burst of 401s triggers
// exactly one /auth/refresh round-trip (the long refresh cookie mints a new short
// access cookie) rather than a storm.
let refreshInFlight: Promise<boolean> | null = null;

function silentRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...options.headers,
    },
    // Send/receive the auth cookies (session + access/refresh) so the signed-in
    // user's own surfaces (/me/*) and topic ownership work. Same-origin in prod.
    credentials: "include",
    // Live dashboard data must never be statically cached.
    cache: "no-store",
  });
  if (!res.ok) {
    // On a 401, try the long refresh token once to mint a fresh access token,
    // then replay the original request. Never loop on the auth endpoints.
    if (res.status === 401 && retryOn401 && !path.startsWith("/auth/")) {
      if (await silentRefresh()) {
        return request<T>(path, options, false);
      }
    }
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, `API ${res.status}: ${detail}`);
  }
  // Some endpoints (204) return no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : (undefined as unknown)) as T;
}

export const client = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Per-topic access signatures (owner + license-bound HMAC) learned from the topic
// list and overview, echoed back as X-Topic-Signature so the backend validates the
// topic itself, not just its numeric id. Absent = the server falls back to the
// ownership check, so this is purely additive hardening.
const topicSignatures = new Map<string, string>();
export function rememberTopicSig(id: string | number, sig?: string | null) {
  if (sig) topicSignatures.set(String(id), sig);
}
function sigHeaders(id: string | number): Record<string, string> {
  const sig = topicSignatures.get(String(id));
  return sig ? { "X-Topic-Signature": sig } : {};
}

/* ----------------------------- Contract types ----------------------------- */

export type ActivityLevel = "info" | "success" | "warning" | "error";

export type ActivityEvent = {
  id: number;
  agent_type: string;
  action: string;
  summary: string;
  level: ActivityLevel;
  created_at: string;
  // Additive, backward-compatible: routes a finding to a report section.
  section?: SectionKey;
};

export type DashboardSummary = {
  tasks_today_total: number;
  tasks_today_completed: number;
  tasks_today_pending: number;
  tasks_today_failed: number;
  active_agents: string[];
  kpis: Record<string, unknown>;
  last_report_date: string | null;
};

export type Task = {
  id: number;
  title: string;
  agent_type: string;
  status: string;
  priority: number;
  created_at: string;
};

export type AgentStatus = {
  agent_type: string;
  last_run_at: string | null;
  last_run_status: string | null;
  last_action?: string | null;
  tasks_today: number;
  tasks_total: number;
  tasks_pending?: number;
  cost_usd?: number;
};

/** A single run in an agent's process log. */
export type AgentRunInfo = {
  id: number;
  run_type: string;
  status: string;
  summary: string | null;
  tokens_used: number | null;
  cost_usd: number | null;
  duration_secs: number | null;
  started_at: string | null;
};

export type AgentQueueItem = {
  id: number;
  title: string;
  status: string;
  priority: number;
  source: string;
  result_summary: string | null;
  prioritized?: boolean;
  depends_on_count?: number;
  created_at: string | null;
  // Ticket detail from the latest run for this task.
  model?: string | null;
  tokens_used?: number | null;
  cost_usd?: number | null;
  duration_secs?: number | null;
  run_status?: string | null;
  ran_at?: string | null;
  prompt?: string | null;
  result?: string | null;
};

/** The orchestrator's response to a prioritization request. */
export type PrioritizeResult = {
  task: { id: number; title: string; priority: number; status: string };
  orchestrator_review: string;
  moved_count: number;
  dependencies_reviewed: {
    id: number;
    title: string;
    agent_type: string;
    status: string;
    prioritized: boolean;
  }[];
};

export type AgentAction = {
  id: number;
  action: string;
  summary: string;
  level: ActivityLevel;
  created_at: string | null;
};

/** Everything the dashboard shows when you open an agent. */
export type AgentDetail = {
  agent_type: string;
  role: string;
  skills: string[];
  stats: {
    runs_total: number;
    cost_usd: number;
    tasks_total: number;
    tasks_pending: number;
  };
  queue: AgentQueueItem[];
  runs: AgentRunInfo[];
  actions: AgentAction[];
};

export type FinanceSummary = {
  mrr_cents: number;
  arr_cents: number;
  active_subscribers: number;
  total_ad_spend_usd: number;
  total_expenses_month_cents: number;
  stripe_balance_cents: number;
  last_snapshot_date: string | null;
  // Additive: real per-company AI model spend + optional cap (backend now
  // returns these). Cents-based to match the rest of the finance contract.
  ai_spend_cents?: number;
  ai_spend_cap_cents?: number;
};

/* ------------------- Living-report (topic) additive types ------------------ */

export type SectionKey =
  | "overview"
  | "battlepass"
  | "context"
  | "integrations"
  | "models"
  | "status"
  | "competitors"
  | "market"
  | "drafts"
  | "decisions"
  | "report"
  // One tab per background agent so all 9 agents' output has a home.
  | "finance"
  | "outreach"
  | "support"
  | "ads"
  | "build"
  | "automations"
  | "network"
  | "security";

// Sections fetched via GET /topic/{id}/{section} → SectionItem[].
// (overview uses /overview, report uses /reports, decisions uses /tasks.)
export type FetchableSection =
  | "competitors"
  | "market"
  | "drafts"
  | "finance"
  | "outreach"
  | "support"
  | "ads"
  | "build";

// Progressive-disclosure item: collapsed summary → expandable detail.
export type SectionItem = {
  id: number | string;
  title: string;
  summary: string;
  detail?: string;
  status?: string;
  agent_type?: string;
  created_at?: string;
  is_new?: boolean;
  // Optional extras used by specific panels.
  tag?: string;
  metrics?: { label: string; value: string }[];
  series?: { t: string; v: number }[];
  // A steering action the user can take on this item (maps item.id → an endpoint).
  action?: "publish" | "send" | "launch";
};

export type TopicOverview = {
  topic: string;
  tagline?: string;
  cycle_day?: number;
  cycle_phase?: string;
  exec_summary?: string;
  // How this topic's agents run: live on the owner's account vs preview/mock.
  run_mode?: "live" | "preview";
  run_source?: "user" | "platform" | "none";
  // Soft-shutdown (pause) state for this topic.
  paused?: boolean;
  paused_at?: string | null;
  // The team's recommended next steps + recent achievements for this topic.
  recommended_next_steps?: string[];
  recent_achievements?: string[];
  kpis?: {
    tasks_today?: number;
    findings?: number;
    active_agents?: number;
    total_agents?: number;
    spend_usd?: number;
    spend_cap_usd?: number;
  };
  spark?: { t: string; v: number }[];
  items?: SectionItem[];
};

export type DailyReport = {
  id: number | string;
  date: string;
  title: string;
  morning_plan?: string;
  evening_summary?: string;
  body?: string;
};

export type CreateTopicResponse = { topic_id: string | number };

/** The agents/skills/prompts/loops that help complete a goal (shown in a modal). */
export type GoalGuide = {
  agents: string[];
  skills: string[];
  prompts: string[];
  loops: string[];
};

/** One interactive momentum step for a topic (a.k.a. a gamification challenge). */
export type TopicGoal = {
  id: number;
  title: string;
  done: boolean;
  guide?: GoalGuide;
  // Challenge overlay (gamification): icon token + cheeky voice line + XP weight.
  icon?: string;
  voice_line?: string;
  difficulty?: ChallengeDifficulty;
  points?: number;
  challenge_key?: string;
};
export type TopicGoals = {
  daily: TopicGoal[];
  weekly: TopicGoal[];
  monthly: TopicGoal[];
};

/* ------------------------------ Battle pass -------------------------------- */

export type ChallengeDifficulty = "trivial" | "standard" | "hard" | "boss";
export type BattlePassTrackKey = "weekly" | "monthly";
export type PaceBadge = "ahead" | "on_pace" | "behind";

export type BattlePassSeason = {
  id: number;
  name: string | null;
  status: "active" | "finished" | "expired" | string;
  starts_at: string;
  ends_at: string;
  target_xp: number;
  days_to_finish: number | null;
};

export type BattlePassTrack = {
  track: BattlePassTrackKey;
  xp: number;
  tier: number;
  max_tier: number;
  tier_floor_xp: number;
  next_tier_xp: number | null;
  claimed_tiers: number[];
};

export type BattlePassPace = {
  badge: PaceBadge;
  xp: number;
  par_xp: number;
  target_xp: number;
  elapsed_days: number;
  season_days: number;
  projected_finish_day: number | null;
};

export type BattlePassCountdown = {
  ends_at: string;
  seconds_left: number;
  days_left: number;
  hours_left: number;
  urgent: boolean;
};

export type BattlePassStreak = {
  days: number;
  longest: number;
  last_activity_date: string | null;
};

export type BattlePassStatus = {
  season: BattlePassSeason;
  tracks: { weekly: BattlePassTrack; monthly: BattlePassTrack };
  pace: BattlePassPace;
  countdown: BattlePassCountdown;
  streak: BattlePassStreak;
};

export type Reward = {
  class: "cosmetic" | "unlock" | "credits";
  label: string;
  icon: string;
  credits_cents?: number;
  unlock?: string;
  amount?: number;
  cosmetic?: string;
};

/** One rung on a battle-pass track's tier ladder. */
export type BattlePassTier = {
  tier: number;
  threshold_xp: number;
  reward: Reward;
  unlocked: boolean;
  claimed: boolean;
};

export type BattlePassTiers = {
  season_id: number;
  tracks: { weekly: BattlePassTier[]; monthly: BattlePassTier[] };
};

export type ClaimResult = {
  claimed: boolean;
  already_claimed?: boolean;
  track: BattlePassTrackKey;
  tier: number;
  reward: Reward;
  granted?: { type: string; [k: string]: unknown };
  balance_cents: number;
};

/** The celebration payload returned by a goal toggle (XP delta + any tier-up). */
export type ChallengeEffect = {
  xp_delta: number;
  changed: boolean;
  tier_up: boolean;
  season_finished: boolean;
  weekly_tier: number;
  monthly_tier: number;
  monthly_xp: number;
  season_id: number;
};

/* ------------------------- Signed-in user (me) ---------------------------- */

export type ViewMode = "basic" | "standard" | "advanced";

export type AiExperience = "new" | "advanced";
export type BusinessExperience = "new" | "experienced";
export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "x";

export type UserPreferences = {
  timezone: string | null;
  daily_budget_usd: number | null;
  platform_daily_budget_usd: number;
  // Dashboard density: standard = core five tabs, advanced = every tab.
  view_mode: ViewMode;
  // Onboarding persona — the user's starting point ("first context").
  ai_experience: AiExperience | null;
  business_experience: BusinessExperience | null;
  // Onboarding — existing web/social presence.
  website: string | null;
  social_platform: SocialPlatform | null;
  social_handle: string | null;
};

export type LicenseType = "standard" | "expert" | "support" | "admin";

/** What the license entitles the user to — drives view + feature gating. */
export type Entitlements = {
  view: "standard" | "expert";
  features: {
    expert_view: boolean;
    expert_tabs: boolean;
    admin_portal: boolean;
    support_queue: boolean;
    manage_roles: boolean;
  };
  can_upgrade_to_expert: boolean;
};

export type SecuritySection = {
  is_admin: boolean;
  is_support: boolean;
  is_staff: boolean;
  has_password?: boolean;
  license: License;
  entitlements: Entitlements;
};

export type License = {
  // The license id (branded, e.g. "CYT-LIC-000123").
  id: string | null;
  type: LicenseType | string;
  label?: string; // human label, e.g. "Business owner"
  status: string; // active | suspended | expired
  since: string | null;
};

export type Affiliate = {
  id: string | null;
  link: string;
  referral_count: number;
};

export type MeProfile = {
  id: number;
  // Master profile id shown at the top of the profile, e.g. "CYT-PRO-000123".
  profile_id?: string | null;
  // Permanent branded account number, e.g. "CYT-000123".
  account_number?: string | null;
  // Referral / affiliate code, e.g. "CYT-AF-000123".
  affiliate_id?: string | null;
  // Affiliate link + running count of people this user has introduced.
  affiliate?: Affiliate;
  license?: License;
  name: string | null;
  nickname: string | null;
  show_nickname: boolean;
  // Identity shown across the app: nickname (if opted in) else account name.
  display_name: string | null;
  phone: string | null;
  email: string | null;
  // Whether the user has a login password set (phone-first users start without one).
  has_password?: boolean;
  is_admin: boolean;
  // Support-team member (admin-portal support queue); staff = admin OR support.
  is_support?: boolean;
  is_staff?: boolean;
  // Structured login sections; `security.entitlements` drives view/feature gating.
  security?: SecuritySection;
  topics_count: number;
  joined_at: string | null;
  preferences?: UserPreferences;
};

export type TopicReviewStatus = "queued" | "reviewing" | "reviewed";

export type MyTopic = {
  id: number;
  name: string;
  topic: string;
  industry: string | null;
  status: TopicReviewStatus;
  tasks_total: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_failed: number;
  findings: number;
  reviewed: boolean;
  // Soft-shutdown (pause) state — server-owned, so it holds across devices.
  paused: boolean;
  paused_at: string | null;
  last_activity_at: string | null;
  created_at: string | null;
  // Tamper-evident handle (owner + license bound). Sent back as X-Topic-Signature
  // so the topic page validates itself, not just its numeric id.
  access_sig?: string;
};

/** Response from pausing/resuming a project (soft shutdown + checkpointed resume). */
export type PauseResult = {
  topic: MyTopic;
  soft_shutdown?: { already_paused: boolean; agents: number; held_tasks: number };
  resume?: { was_paused: boolean; restored_tasks: number };
};

/** Project context captured via the Context survey/interview. */
export type TopicContext = {
  goals?: string | null;
  categories?: string | null;
  target_market?: string | null;
  competitor_notes?: string | null;
  notes?: string | null;
};

export type MyTopicsResponse = {
  user: { id: number; name: string | null; phone: string | null };
  count: number;
  topics: MyTopic[];
};

// XTKRecall MCP paid add-on — a managed, hosted knowledge/memory vault reachable
// over MCP. Per-user grain (serves all the owner's topics). Secrets are never
// returned; the provisioned key is exposed only masked, and only while entitled.
export type XtkRecallStatus = {
  entitlement_key: string;
  entitled: boolean;
  status: "none" | "active" | "canceled" | string;
  plan: { name: string; price_cents: number };
  provisioned: boolean;
  endpoint: string | null;
  namespace: string | null;
  masked_key: string | null;
  granted_at: string | null;
  canceled_at: string | null;
  billing_live: boolean;
};

/** A Stripe Checkout session (add-on subscribe). `url` is where the browser goes. */
export type CheckoutSession = {
  url: string;
  id: string;
  simulated: boolean;
};

// Bring-your-own AI credential — how the signed-in user's agent work bills to
// their own account. Secrets are never returned; this is status only.
export type AiCredential = {
  connected: boolean;
  auth_type: "api_key" | "oauth" | null;
  account_label: string | null;
  status: "active" | "needs_reauth" | null;
  expires_at: string | null;
  last_validated_at: string | null;
  oauth_available: boolean;
};

/* --------------------------- Section normalizers --------------------------- */
// The backend returns domain-shaped section payloads (e.g. { section, posts })
// while the dashboard renders a flat SectionItem[]. These map one to the other
// and attach the steering action (publish/send/launch) each item supports.

function truncate(s: string, n: number): string {
  s = (s ?? "").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function normalizeSection(section: FetchableSection, raw: any): SectionItem[] {
  switch (section) {
    case "competitors":
      return (raw?.competitors ?? []).map((c: any) => ({
        id: c.id,
        title: c.name ?? "Competitor",
        summary: c.positioning ?? "Competitor profile",
        detail: [
          c.website ? `Website: ${c.website}` : null,
          c.strengths?.length ? `Strengths: ${c.strengths.join(", ")}` : null,
          c.weaknesses?.length ? `Weaknesses: ${c.weaknesses.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        agent_type: "competitor_research",
        tag: "competitor",
        created_at: c.created_at,
      }));
    case "drafts":
      return (raw?.posts ?? []).map((p: any) => {
        const tags = p.engagement?.hashtags?.length
          ? `\n\n${p.engagement.hashtags.join(" ")}`
          : "";
        return {
          id: p.id,
          title: truncate(p.content ?? "Draft post", 64),
          summary: p.content ?? "",
          detail: `${p.content ?? ""}${tags}`,
          status: p.status,
          agent_type: "social_media",
          tag: p.platform ?? "twitter",
          action: p.status === "published" ? undefined : "publish",
          created_at: p.created_at,
        };
      });
    case "outreach":
      return (raw?.campaigns ?? []).map((c: any) => ({
        id: c.id,
        title: c.name ?? "Email campaign",
        summary: c.goal ?? c.target_segment ?? "Outreach campaign",
        detail: [
          c.target_segment ? `Segment: ${c.target_segment}` : null,
          `Emails sent: ${c.total_sent ?? 0}`,
        ]
          .filter(Boolean)
          .join("\n"),
        status: c.status,
        agent_type: "email_outreach",
        metrics: [{ label: "Sent", value: String(c.total_sent ?? 0) }],
        action: c.status === "draft" ? "send" : undefined,
        created_at: c.created_at,
      }));
    case "ads":
      return (raw?.campaigns ?? []).map((c: any) => ({
        id: c.id,
        title: c.name ?? "Ad campaign",
        summary: `${c.goal ?? "campaign"} · $${c.daily_budget_usd ?? 0}/day on ${c.platform ?? "meta"}`,
        detail: [
          `Platform: ${c.platform ?? "—"}`,
          `Goal: ${c.goal ?? "—"}`,
          `Daily budget: $${c.daily_budget_usd ?? 0}`,
          c.external_id ? `External id: ${c.external_id}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        status: c.status,
        agent_type: "ads_management",
        metrics: [{ label: "Budget", value: `$${c.daily_budget_usd ?? 0}/day` }],
        action:
          c.status === "planned" || c.status === "draft" ? "launch" : undefined,
        created_at: c.created_at,
      }));
    case "market": {
      const items: SectionItem[] = [];
      if (raw?.positioning)
        items.push({
          id: "positioning",
          title: "Positioning",
          summary: String(raw.positioning),
          agent_type: "business_planning",
        });
      (raw?.goals ?? []).forEach((g: any, i: number) =>
        items.push({
          id: `goal-${i}`,
          title: "Goal",
          summary: typeof g === "string" ? g : JSON.stringify(g),
          agent_type: "business_planning",
        }),
      );
      return items;
    }
    case "finance": {
      const items: SectionItem[] = [
        {
          id: "ai-spend",
          title: "AI spend",
          summary: `$${raw?.ai_spend_usd ?? 0} on model calls — capped & sandboxed`,
          status: raw?.revenue_status,
          agent_type: "finance",
        },
      ];
      if (raw?.analysis?.summary)
        items.push({
          id: "finance-analysis",
          title: "Finance analysis",
          summary: String(raw.analysis.summary),
          detail: JSON.stringify(raw.analysis, null, 2),
          agent_type: "finance",
        });
      return items;
    }
    case "support":
    case "build": {
      const key = section === "support" ? "drafts" : "specs";
      const at = section === "support" ? "customer_support" : "code_generation";
      const items: SectionItem[] = (raw?.[key] ?? []).map((d: any) => ({
        id: d.id,
        title: d.title ?? (section === "support" ? "Support note" : "Build spec"),
        summary: truncate(d.content ?? "", 140),
        detail: d.content,
        agent_type: at,
        created_at: d.created_at,
      }));
      if (raw?.analysis?.summary)
        items.unshift({
          id: `${section}-analysis`,
          title: section === "support" ? "Support summary" : "Build summary",
          summary: String(raw.analysis.summary),
          agent_type: at,
        });
      return items;
    }
    default:
      return [];
  }
}

/* ------------------------------ API surface ------------------------------- */

// Company-scope query fragment for the dashboard surfaces.
function cq(companyId?: string | number): string {
  return companyId ? `?company_id=${companyId}` : "";
}

/* -------------------------- Support desk + admin portal -------------------- */

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type TicketUser = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type SupportTicket = {
  id: number;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  user?: TicketUser | null;
  company?: { id: number; name: string } | null;
  assignee?: { id: number; name: string | null } | null;
  messages_count: number;
  last_activity_at: string | null;
  created_at: string | null;
  resolved_at?: string | null;
};

export type TicketMessage = {
  id: number;
  author_role: "user" | "support" | "system";
  author_name?: string;
  body: string;
  created_at: string | null;
};

export type TicketThread = { ticket: SupportTicket; messages: TicketMessage[] };

export type QueueCounts = {
  open: number;
  pending: number;
  unassigned: number;
  mine: number;
  resolved_today: number;
};

export type StaffWhoami = {
  id: number;
  name: string | null;
  email: string | null;
  is_admin: boolean;
  is_support: boolean;
  role: "admin" | "support";
};

export type AdminOverview = {
  companies: number;
  users: number;
  admins: number;
  tasks: { total: number; pending: number; in_progress: number; completed: number; failed: number };
  agent_runs: { total: number; today: number; failed_today: number };
  spend: { today_usd: number; all_time_usd: number; tokens_today: number };
  mode: { agent_mock: boolean; sandbox: boolean; daily_budget_usd: number };
};

export type AdminUserRow = {
  id: number;
  account_number: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_support: boolean;
  license: License;
  companies: number;
  created_at: string | null;
};

export type AdminCompanyRow = {
  id: number;
  name: string;
  topic: string | null;
  industry: string | null;
  created_at: string | null;
  owner: { id: number; name: string | null; email: string | null; phone: string | null } | null;
  tasks: number;
  agent_runs: number;
  spend_usd: number;
};

export type SupportAgentRow = {
  id: number;
  name: string;
  is_admin: boolean;
  is_support: boolean;
  open_assigned: number;
};

export const cytapi = {
  // Landing → seed the company from one line.
  createTopic: (topic: string) =>
    client.post<CreateTopicResponse>("/onboarding/topic", { topic }),

  // Dashboard KPIs.
  dashboardSummary: () => client.get<DashboardSummary>("/dashboard/summary"),

  // Agent status grid (polled by useAgentStatus), scoped to a topic/company.
  agentStatus: (companyId?: string | number) =>
    request<AgentStatus[]>(
      `/agents/status${cq(companyId)}`,
      companyId ? { headers: sigHeaders(companyId) } : {},
    ),

  // Full working picture for one agent: skills, queue, process (runs), actions.
  agentDetail: (agentType: string, companyId?: string | number) =>
    request<AgentDetail>(
      `/agents/${agentType}/detail${cq(companyId)}`,
      companyId ? { headers: sigHeaders(companyId) } : {},
    ),

  // Kick a one-off run of an agent for a topic. An optional prompt is sent as a
  // directive the agent addresses specifically ("Run this prompt" from a goal).
  agentTrigger: (
    agentType: string,
    companyId?: string | number,
    prompt?: string,
  ) =>
    request<{ message: string; task_id?: number }>(
      `/agents/${agentType}/trigger${cq(companyId)}`,
      {
        method: "POST",
        body: JSON.stringify(prompt ? { prompt } : {}),
        ...(companyId ? { headers: sigHeaders(companyId) } : {}),
      },
    ),

  // Tasks list (Decisions panel).
  tasks: (limit = 100) => client.get<Task[]>(`/tasks?limit=${limit}`),

  // Steer a task: approve/reject/priority, or escalate it to the orchestrator
  // for prioritization (which also moves any blocking dependencies ahead).
  updateTask: (id: number, patch: { status?: string; priority?: number }) =>
    client.put<Task>(`/tasks/${id}`, patch),
  prioritizeTask: (id: number) =>
    client.post<PrioritizeResult>(`/tasks/${id}/prioritize`),

  // Finance snapshot (spend / MRR tiles), scoped to a topic/company.
  financeSummary: (companyId?: string | number) =>
    request<FinanceSummary>(
      `/finance/summary${cq(companyId)}`,
      companyId ? { headers: sigHeaders(companyId) } : {},
    ),

  // Living-report topic surfaces — normalized from the backend's domain shapes.
  topicOverview: async (id: string): Promise<TopicOverview> => {
    const raw: any = await request(`/topic/${id}/overview`, {
      headers: sigHeaders(id),
    });
    rememberTopicSig(id, raw?.access_sig);
    const plan = raw?.latest_plan ?? {};
    const items: SectionItem[] = [];
    if (raw?.company?.value_prop)
      items.push({
        id: "value-prop",
        title: "Value proposition",
        summary: String(raw.company.value_prop),
        agent_type: "orchestrator",
      });
    if (plan.summary)
      items.push({
        id: "plan",
        title: "The plan",
        summary: String(plan.summary),
        detail: JSON.stringify(plan, null, 2),
        agent_type: "business_planning",
      });
    (raw?.company?.goals ?? []).forEach((g: any, i: number) =>
      items.push({
        id: `ov-goal-${i}`,
        title: "Goal",
        summary: typeof g === "string" ? g : JSON.stringify(g),
        agent_type: "business_planning",
      }),
    );
    return {
      topic: raw?.company?.topic ?? "",
      tagline: raw?.company?.value_prop,
      exec_summary: plan.summary ?? raw?.company?.mission,
      cycle_day: raw?.cycle_day,
      cycle_phase: raw?.cycle_phase,
      run_mode: raw?.run_mode,
      run_source: raw?.run_source,
      paused: raw?.paused,
      paused_at: raw?.paused_at,
      recommended_next_steps: raw?.recommended_next_steps ?? [],
      recent_achievements: raw?.recent_achievements ?? [],
      kpis: raw?.kpis ?? {},
      spark: raw?.spark ?? [],
      items,
    };
  },
  section: async (
    id: string,
    section: FetchableSection,
  ): Promise<SectionItem[]> =>
    normalizeSection(
      section,
      await request(`/topic/${id}/${section}`, { headers: sigHeaders(id) }),
    ),

  // Daily report artifacts.
  reports: (limit = 20) => client.get<DailyReport[]>(`/reports?limit=${limit}`),
  report: (id: string) => client.get<DailyReport>(`/reports/${id}`),

  // Backfill activity events missed across a WS reconnect, scoped to a topic.
  activitySince: (sinceId: number, companyId?: string | number) =>
    request<ActivityEvent[]>(
      `/activity?since=${sinceId}${companyId ? `&company_id=${companyId}` : ""}`,
      companyId ? { headers: sigHeaders(companyId) } : {},
    ),

  // Phone-first SMS-code auth. Fail-soft in the UI until CYTAPI ships these.
  auth: {
    requestSmsCode: (phone: string) =>
      client.post<{ sent: boolean }>("/auth/sms/request", { phone }),
    verifySmsCode: (phone: string, code: string) =>
      client.post<{ authenticated: boolean }>("/auth/sms/verify", {
        phone,
        code,
        ref: getRef(),
      }),
    session: () =>
      client.get<{
        authenticated: boolean;
        phone?: string;
        is_admin?: boolean;
        is_support?: boolean;
        is_staff?: boolean;
      }>("/auth/session"),
    // Email/username + password (phone SMS-OTP stays primary).
    passwordLogin: (identifier: string, password: string) =>
      client.post<{ authenticated: boolean }>("/auth/password/login", {
        identifier,
        password,
      }),
    register: (payload: {
      email: string;
      password: string;
      name?: string;
      nickname?: string;
    }) =>
      client.post<{ authenticated: boolean; email: string }>("/auth/register", {
        ...payload,
        ref: getRef(),
      }),
    // Trade the long refresh cookie for a fresh access cookie (usually automatic
    // via the 401 interceptor; exposed for explicit use too).
    refresh: () => client.post<{ authenticated: boolean }>("/auth/refresh"),
    logout: () => client.post<void>("/auth/logout"),
  },

  // The signed-in user's own surfaces (session-backed; require credentials).
  me: () => client.get<MeProfile>("/me"),
  myTopics: async (): Promise<MyTopicsResponse> => {
    const res = await client.get<MyTopicsResponse>("/me/topics");
    res.topics?.forEach((t) => rememberTopicSig(t.id, t.access_sig));
    return res;
  },
  // Pause = soft shutdown (checkpoint every agent, hold in-flight work);
  // resume restores the checkpointed queue. Server-owned state.
  pauseTopic: (id: string | number) =>
    client.post<PauseResult>(`/me/topics/${id}/pause`),
  resumeTopic: (id: string | number) =>
    client.post<PauseResult>(`/me/topics/${id}/resume`),
  // Context survey/interview for a project (owner-scoped).
  topicContext: (id: string | number) =>
    client.get<{ context: TopicContext }>(`/me/topics/${id}/context`),
  saveTopicContext: (id: string | number, patch: TopicContext) =>
    client.put<{ context: TopicContext }>(`/me/topics/${id}/context`, patch),
  // Set the project's daily spend cap (from the Overview effort presets).
  setTopicSpendCap: (id: string | number, amount: number | null) =>
    client.put<{ spend_cap_usd: number | null }>(`/me/topics/${id}/spend-cap`, {
      amount,
    }),
  // Interactive per-topic goals (daily / weekly / monthly momentum steps).
  topicGoals: (id: string | number) =>
    client.get<{ goals: TopicGoals }>(`/me/topics/${id}/goals`),
  toggleTopicGoal: (id: string | number, goalId: number) =>
    client.post<{ id: number; done: boolean; battlepass: ChallengeEffect }>(
      `/me/topics/${id}/goals/${goalId}/toggle`,
    ),

  // Battle pass — per-topic 29-day season status, tier ladder, and tier claims.
  battlePass: (id: string | number) =>
    client.get<BattlePassStatus>(`/me/topics/${id}/battlepass`),
  battlePassTiers: (id: string | number) =>
    client.get<BattlePassTiers>(`/me/topics/${id}/battlepass/tiers`),
  claimTier: (id: string | number, track: BattlePassTrackKey, tier: number) =>
    client.post<ClaimResult>(`/me/topics/${id}/battlepass/claim`, {
      track,
      tier,
    }),

  // Per-topic integrations — connect a service with a token / secret key. The
  // secret is stored encrypted server-side and never returned (status only).
  topicIntegrations: (id: string | number) =>
    client.get<{
      connections: { provider: string; status: string; connected_at: string | null }[];
    }>(`/me/topics/${id}/integrations`),
  saveIntegration: (
    id: string | number,
    provider: string,
    credentials: Record<string, string>,
  ) =>
    client.put<{ provider: string; status: string; fields: string[] }>(
      `/me/topics/${id}/integrations/${provider}`,
      { credentials },
    ),
  disconnectIntegration: (id: string | number, provider: string) =>
    client.del<{ provider: string; status: string }>(
      `/me/topics/${id}/integrations/${provider}`,
    ),

  // XTKRecall MCP paid add-on — the hosted vault. Status flips the Integrations
  // tile between "Subscribe" (not entitled) and manage/show-endpoint (entitled).
  // Subscribe returns a Stripe Checkout URL; the entitlement is granted only after
  // payment clears (webhook), so the caller re-fetches status on return. Cancel
  // revokes + returns the now-fail-closed status.
  xtkrecall: {
    status: (id: string | number) =>
      client.get<XtkRecallStatus>(`/me/topics/${id}/xtkrecall`),
    subscribe: (id: string | number) =>
      client.post<CheckoutSession>(`/me/topics/${id}/xtkrecall/subscribe`),
    cancel: (id: string | number) =>
      client.del<XtkRecallStatus>(`/me/topics/${id}/xtkrecall`),
  },
  updateProfile: (patch: {
    name?: string | null;
    nickname?: string | null;
    show_nickname?: boolean;
    email?: string | null;
  }) => client.put<MeProfile>("/me", patch),
  updatePassword: (patch: {
    current_password?: string;
    password: string;
    password_confirmation: string;
  }) => client.put<{ has_password: boolean }>("/me/password", patch),
  updatePreferences: (patch: {
    timezone?: string | null;
    daily_budget_usd?: number | null;
    view_mode?: ViewMode;
    ai_experience?: AiExperience | null;
    business_experience?: BusinessExperience | null;
    website?: string | null;
    social_platform?: SocialPlatform | null;
    social_handle?: string | null;
  }) => client.put<UserPreferences>("/me/preferences", patch),

  // Bring-your-own AI credential — connect an API key or an OAuth account so the
  // user's agent usage runs on their own account.
  aiCredential: {
    get: () => client.get<AiCredential>("/me/ai-credential"),
    saveApiKey: (apiKey: string) =>
      client.put<AiCredential>("/me/ai-credential/api-key", {
        api_key: apiKey,
      }),
    validate: () =>
      client.post<AiCredential & { ok: boolean; message: string }>(
        "/me/ai-credential/validate",
      ),
    disconnect: () => client.del<{ connected: boolean }>("/me/ai-credential"),
    oauthStart: () =>
      client.post<{ authorize_url: string }>("/me/ai-credential/oauth/start"),
    oauthCallback: (code: string, state: string) =>
      client.post<AiCredential>("/me/ai-credential/oauth/callback", {
        code,
        state,
      }),
  },

  // The signed-in user's own support tickets (filed here, worked in the portal).
  support: {
    myTickets: () => client.get<{ data: SupportTicket[] }>("/me/support/tickets"),
    create: (payload: { subject: string; body: string; category?: string; company_id?: number }) =>
      client.post<TicketThread>("/me/support/tickets", payload),
    ticket: (id: string | number) =>
      client.get<TicketThread>(`/me/support/tickets/${id}`),
    reply: (id: string | number, body: string) =>
      client.post<TicketThread>(`/me/support/tickets/${id}/reply`, { body }),
  },

  // Admin portal — staff (admin OR support). Reads + support queue are staff-wide;
  // role toggles are admin-only (the API 403s a support agent that calls them).
  admin: {
    whoami: () => client.get<StaffWhoami>("/admin/whoami"),
    overview: () => client.get<AdminOverview>("/admin/overview"),
    users: () => client.get<{ data: AdminUserRow[] }>("/admin/users"),
    companies: () => client.get<{ data: AdminCompanyRow[] }>("/admin/companies"),
    activity: (limit = 100) =>
      client.get<{ data: ActivityEvent[] }>(`/admin/activity?limit=${limit}`),
    setAdmin: (id: number, grant: boolean) =>
      client.post<{ id: number; is_admin: boolean }>(`/admin/users/${id}/admin`, { grant }),
    setSupport: (id: number, grant: boolean) =>
      client.post<{ id: number; is_support: boolean }>(`/admin/users/${id}/support`, { grant }),
    setLicense: (id: number, payload: { type?: string; status?: string }) =>
      client.post<{ id: number; license: License }>(`/admin/users/${id}/license`, payload),

    // Support queue.
    queue: (params: { status?: string; assignee?: string; priority?: string; q?: string } = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][],
      ).toString();
      return client.get<{ data: SupportTicket[]; counts: QueueCounts }>(
        `/admin/support/tickets${qs ? `?${qs}` : ""}`,
      );
    },
    ticket: (id: string | number) =>
      client.get<TicketThread>(`/admin/support/tickets/${id}`),
    reply: (id: string | number, body: string) =>
      client.post<TicketThread>(`/admin/support/tickets/${id}/reply`, { body }),
    assign: (id: string | number, payload: { me?: boolean; assignee_id?: number | null; unassign?: boolean }) =>
      client.post<{ ticket: SupportTicket }>(`/admin/support/tickets/${id}/assign`, payload),
    setTicketStatus: (id: string | number, payload: { status?: TicketStatus; priority?: TicketPriority }) =>
      client.post<{ ticket: SupportTicket }>(`/admin/support/tickets/${id}/status`, payload),
    agents: () => client.get<{ data: SupportAgentRow[] }>("/admin/support/agents"),
  },
};
