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

/**
 * When the admin surface requires two-factor, its endpoints answer 403 with a
 * body naming what's missing. Maps that to the step-up the UI must run:
 *   "enroll" — no authenticator yet (set one up), "verify" — enrolled but this
 *   session hasn't proven a code. null = not a 2FA challenge.
 */
export function totpChallenge(e: unknown): "enroll" | "verify" | null {
  if (e instanceof ApiError && e.status === 403) {
    if (e.message.includes("totp_enrollment_required")) return "enroll";
    if (e.message.includes("totp_required")) return "verify";
  }
  return null;
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
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
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
  // The exact config state this run executed against (per-action audit stamp):
  // the agent's profile version + the active realign-override version, if any.
  profile_version?: string | null;
  override_version?: number | null;
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

/* --------------------- Agent standard-schema profile ---------------------- */
// The single source of truth for the agent-detail view: role, model, skills,
// loops, prompt summary, cadence, and the owner's realign-override state — all
// served by the API so the GUI has no hardcoded per-agent data.

export type AgentSkill = { key: string; name: string; description: string };

export type AgentLoop = {
  key: string;
  name: string;
  trigger: string;
  behavior: string;
  // Design proposal only (badge it) — the cadence is unchanged.
  proposed?: boolean;
};

/** The active "realign with a new prompt" override on an agent, if any. */
export type AgentPromptState = {
  summary: string;
  override_active: boolean;
  // Version of the active realign-override in force (null when on the built-in).
  override_version?: number | null;
  override: {
    id: number;
    name: string | null;
    version?: number;
    content: string;
  } | null;
  extends_count: number;
};

export type AgentProfile = {
  agent_type: string;
  role: string;
  model: string;
  prompt_summary: string;
  cadence: string;
  skills: AgentSkill[];
  loops: AgentLoop[];
  // Short content hash of the profile (role+prompt+skills+loops) — the value each
  // agent_run stamps as its profile_version.
  version?: string;
  prompt: AgentPromptState;
};

/** An imported prompt row (agent realign override / extend). */
export type ImportedPromptRow = {
  id: number;
  scope: "agent" | "goal";
  target_key: string;
  mode: "override" | "extend";
  name: string | null;
  content: string;
  active: boolean;
  sort: number;
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
  | "team"
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
  | "security"
  // Media — the topic's generated creative output (images, clips, posts, ads).
  // Placeholder/scaffold for now; no backend section fetch yet.
  | "media"
  // Invoicing (billing) + Services (professional service requests + one-click
  // subscribable services). Scaffold/interface pass; no backend section fetch yet.
  | "invoicing"
  | "services";

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

/**
 * A first-class recommended next step: a human action (never a raw system-
 * trigger label) with the why, owning agent + role, expected artifact, and the
 * agent to trigger for its CTA.
 */
export type RecommendedStep = {
  id?: number;
  title: string;
  why?: string | null;
  owner?: string | null; // agent_type of the owning agent
  owner_role?: string | null;
  artifact?: string | null;
  agent_type?: string | null; // agent the CTA triggers (null if not runnable)
  status?: string;
  cta?: string;
};

/** Liveness state so a blank-but-alive dashboard reads apart from a stalled one. */
export type TopicActivity = {
  state: "working" | "queued" | "stalled" | "idle";
  pending?: number;
  running?: number;
  active_agents?: number;
  total_runs?: number;
  last_activity_at?: string | null;
};

export type TopicOverview = {
  topic: string;
  // Identity the page displays + matches: which account owns this topic and the
  // owner's license snapshot. The server-side ownership + license WALL is the
  // real gate; these are for display/identity-match only, never the access check.
  user_id?: number;
  license?: License;
  // Tamper-evident, owner + license-bound signature for this topic (the signed
  // identity "hash"). Non-secret; safe to stamp on the page as an identifier.
  access_sig?: string;
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
  // Liveness snapshot (queued / working / stalled / idle) for the alive-signal.
  activity?: TopicActivity;
  // The team's recommended next steps + recent achievements for this topic.
  recommended_next_steps?: RecommendedStep[];
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
  // A compact business profile (summary + bullets about the topic) for the
  // overview header. `grounded` is false while it's still a provisional sketch.
  business_profile?: {
    summary: string;
    grounded?: boolean;
    bullets: string[];
    // Header tiles — the real business type + industry (null until the backend sets them).
    business_type?: string | null;
    industry?: string | null;
  };
};

/* --------------------- KPI-tile drill-down (modal) types ------------------- */

/** A task counted by the "Tasks today" tile. */
export type KpiTaskItem = {
  id: number;
  title: string;
  agent_type: string;
  status: string;
  priority: number;
  created_at: string | null;
};
export type KpiTasksToday = { total: number; items: KpiTaskItem[] };

/** A single research finding behind the "Findings" tile (competitor or draft). */
export type KpiFindingItem = {
  id: string;
  kind: "competitor" | "post";
  title: string;
  summary?: string;
  status?: string;
  agent_type?: string;
  created_at?: string | null;
};
export type KpiFindings = {
  total: number;
  counts: { competitors: number; posts: number };
  items: KpiFindingItem[];
};

/** One model run contributing to the spend tile. */
export type KpiSpendRun = {
  id: number;
  agent_type: string;
  run_type: string;
  status: string;
  model: string | null;
  tokens_used: number | null;
  cost_usd: number;
  duration_secs: number | null;
  started_at: string | null;
};
export type KpiSpendByAgent = {
  agent_type: string;
  cost_usd: number;
  runs: number;
  tokens_used: number;
};
export type KpiSpend = {
  total_usd: number;
  by_agent: KpiSpendByAgent[];
  items: KpiSpendRun[];
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

/** One plan deliverable on the plan board, with its earned-badge state. */
export type PlanAchievementItem = {
  key: string;
  label: string;
  badge: string;
  achieved: boolean;
  achieved_at: string | null;
  source: string | null;
};

/** One badge on the topic's trophy shelf (a plan badge or a milestone badge). */
export type AchievementBadge = {
  kind: "plan" | "milestone";
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  achieved: boolean;
  earned_at: string | null;
  detail: string | null;
};
export type AchievementShelf = {
  earned: number;
  total: number;
  badges: AchievementBadge[];
};

/** One member of a topic's agent team. */
export type TeamAgent = {
  agent_type: string;
  role: string;
  stock: boolean;
  removable: boolean;
};
export type AvailableAgent = { agent_type: string; role: string };
export type AgentTeam = { team: TeamAgent[]; available: AvailableAgent[] };

/** An agent-of-record: stable identity + charter, plus its recallable work ledger. */
export type AgentRecord = {
  agent: {
    id: string;
    role: string;
    mission: string;
    model: string;
    version: string;
    skills: string[];
  };
  record: {
    runs: number;
    succeeded: number;
    failed: number;
    total_cost_usd: number;
    total_tokens: number;
    last_active_at: string | null;
    recent_work: {
      run_id: number;
      status: string;
      summary: string | null;
      model: string;
      profile_version: string | null;
      cost_usd: number;
      at: string | null;
    }[];
  };
};

/* ------------------------------ Voices / TTS ------------------------------- */

/** Which voice provider a topic connected. `voices` = local Kokoro (OpenAI-compatible). */
export type VoiceProviderKey = "voices" | "elevenlabs";

/** One voice a topic can pick from (catalog default or the provider's own list). */
export type Voice = { id: string; name: string; engine: string };

/** GET /me/topics/{id}/voices — connected-voice status; no secrets are returned. */
export type VoiceStatus = {
  connected: boolean;
  mode: "preview" | "live";
  provider: VoiceProviderKey;
  default_voice_id: string;
  voices: Voice[];
};

/** POST /me/topics/{id}/voices/speak — a synthesized line. `mock` → a simulated URL. */
export type SpeakResult = {
  audio_url: string;
  voice_id: string;
  source: "topic" | "platform";
  provider: VoiceProviderKey;
  mock: boolean;
  text: string;
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

/* -------------------- Competitive milestone leaderboard -------------------- */
// The 29-day BUSINESS RACE: rank opted-in topics by how FAST they hit real
// milestones (website live → $1 → $1k → volume) + the Social Media Engineer's
// real reach (views/clicks/conversions). Privacy-safe — no other topic's raw
// revenue is exposed, only earned milestone badges + days.

export type MilestoneCategory = "business" | "social";
export type LeaderboardMetricSort =
  | "speed"
  | "revenue"
  | "views"
  | "clicks"
  | "conversions";

/** One rung in the milestone catalog (legend/badges). */
export type MilestoneCatalogItem = {
  key: string;
  label: string;
  icon: string;
  category: MilestoneCategory;
  order: number;
  // Whether a REAL signal backs this today, or it awaits Stripe-live / live X+Ads.
  real_backed: boolean;
};

/** An earned milestone on a leaderboard row (with its speed). */
export type LeaderboardMilestone = {
  key: string;
  label: string;
  icon: string;
  category: MilestoneCategory;
  order: number;
  days_from_start: number;
};

/** One business on the race board (privacy-safe projection). */
export type LeaderboardEntry = {
  rank: number | null;
  id: number;
  name: string;
  category: string | null;
  is_you: boolean;
  milestones: LeaderboardMilestone[];
  milestones_count: number;
  business_stage: number; // 0..4 (furthest business milestone)
  business_stage_label: string;
  social_count: number;
  furthest_milestone: string | null;
  days_from_start: number | null; // days to the furthest milestone
  metrics: { views: number; clicks: number; conversions: number };
  started_at: string;
  days_elapsed: number;
};

export type LeaderboardResponse = {
  metric: LeaderboardMetricSort;
  scope: string;
  season_days: number;
  total: number;
  page: number;
  per_page: number;
  pages: number;
  categories: string[];
  catalog: MilestoneCatalogItem[];
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
  your_entries: LeaderboardEntry[];
  filters: {
    category: string | null;
    milestone: string | null;
    metric: LeaderboardMetricSort;
    q: string | null;
  };
};

export type LeaderboardFilters = {
  category?: string | null;
  milestone?: string | null;
  metric?: LeaderboardMetricSort;
  q?: string | null;
  page?: number;
  per_page?: number;
};

/** A single topic's own race standing (owner-scoped). */
export type TopicLeaderboard = {
  opt_in: boolean;
  rank: number | null;
  catalog: MilestoneCatalogItem[];
  milestones: {
    key: string;
    category: MilestoneCategory;
    days_from_start: number;
    achieved_at: string | null;
  }[];
  metrics: { views: number; clicks: number; conversions: number };
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

/** Structured context extracted from a spoken/typed description. */
export type ContextExtraction = {
  goals: string;
  categories: string[];
  target_market: string;
  competitor_notes: string;
  notes: string;
  transcript: string;
};

export type MyTopicsResponse = {
  user: { id: number; name: string | null; phone: string | null };
  count: number;
  topics: MyTopic[];
};

/**
 * Response to a push-to-talk / typed cue: Winslow's triage ticket, plus the
 * specialist task he routed it to (present once the triage has run — e.g. in the
 * mock/sync path; null while the triage is still queued).
 */
export type CueResult = {
  message: string;
  triage_task: { id: number; agent_type: string; status: string };
  routed_task: {
    id: number;
    agent_type: string;
    title: string;
    status: string;
  } | null;
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

// Operations MCP token — the single revocable, per-user bearer that lets the
// owner's own Claude (Claude Code today) drive their topics through the ops-mcp
// server at $0 platform cost. The plaintext token is returned ONCE on mint;
// afterwards status exposes only a masked label + expiry, never the secret.
export type McpTokenStatus = {
  connected: boolean;
  label: string | null;
  expires_at: string | null;
};

// The one-time mint/rotate response — `token` is the full plaintext, shown once.
export type McpTokenMint = {
  token: string;
  label: string | null;
  expires_at: string | null;
};

// Per-topic integration connection status — one connected provider. Secrets are
// never returned; `masked_key` (when the backend provides it) is a display-only
// masked identifier for the connected credential, never the secret itself.
export type IntegrationConnection = {
  provider: string;
  status: string;
  connected_at: string | null;
  masked_key?: string | null;
};

// Bring-your-own AI credential — how the signed-in user's agent work bills to
// their own account. Secrets are never returned; this is status only.
export type AiProvider = "anthropic" | "openai" | "grok" | "gemini";

/** Per-provider usage bucket (a window of runs). */
export type UsageBucket = { runs: number; tokens: number; cost_usd: number };

/** Per-provider usage: our metered spend (providers don't expose live balance). */
export type ProviderUsage = {
  provider: AiProvider;
  connected: boolean;
  status: string | null;
  today: UsageBucket;
  total: UsageBucket;
};

/** One rung of the provider ladder (a connected provider + its priority). */
export type LadderRung = {
  provider: AiProvider;
  priority: number;
  auth_type: "api_key" | "oauth" | null;
  account_label: string | null;
  status: string | null;
  status_message: string | null;
  last_validated_at: string | null;
};

export type AiCredential = {
  connected: boolean;
  provider?: AiProvider;
  auth_type: "api_key" | "oauth" | null;
  account_label: string | null;
  status: "active" | "needs_reauth" | "insufficient_credit" | null;
  status_message?: string | null;
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

/* ------------------------- Two-factor (TOTP) ------------------------------- */

export type TwoFactorStatus = {
  enabled: boolean;
  pending: boolean;
  verified_this_session: boolean;
  recovery_codes_remaining: number;
};

export type TwoFactorEnroll = { secret: string; otpauth_uri: string };

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

/* --------------------- Winslow team check-in (coordination) --------------- */

export type TeamAgentState = "on_track" | "idle" | "blocked" | "never_run";

export type TeamRosterAgent = {
  agent_type: string;
  role: string;
  state: TeamAgentState;
  state_label: string;
  focus: string;
  note: string;
  last_run_at?: string | null;
  last_run_status?: string | null;
  tasks_pending?: number;
  tasks_failed?: number;
};

export type TeamStatus = {
  company_id: number | null;
  generated_at?: string | null;
  source?: string;
  generated_by?: string;
  summary: string;
  coordination_notes: string[];
  stats: Partial<Record<TeamAgentState | "total", number>>;
  roster: TeamRosterAgent[];
};

/* ------------------------------ Roadmap queue ------------------------------ */

export type RoadmapStatus =
  | "proposed"
  | "in_progress"
  | "in_review"
  | "shipped"
  | "archived";
export type RoadmapChannel = "feature" | "support" | "access";

/** One enhancement on the roadmap queue. */
export type RoadmapEntry = {
  id: number;
  title: string;
  description: string | null;
  channel: RoadmapChannel;
  status: RoadmapStatus;
  priority: number; // 1 = highest / do first
  source: string; // winslow | owner | analyst | promotion
  task_id: number | null;
  shipped_at: string | null;
  release_note: string | null;
  updated_at: string | null;
};

/** The topic's roadmap: the open queue (priority order), shipped history, next. */
export type RoadmapLedger = {
  queue: RoadmapEntry[];
  shipped: RoadmapEntry[];
  next: RoadmapEntry | null;
  counts: {
    open: number;
    in_progress: number;
    in_review: number;
    shipped: number;
    total: number;
  };
};

/* ------------------------------ Ads page hub ------------------------------- */

export type IntegrationHealth = {
  ok: boolean;
  mode: "mock" | "live";
  detail: string;
};

export type AdCampaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  daily_budget_usd?: number;
  impressions?: number;
  clicks?: number;
  leads?: number;
  simulated?: boolean;
};

export type AdLead = {
  id: string;
  name: string;
  source?: string | null;
  stage?: string;
  status?: string | null;
  company?: string | null;
  value_usd?: number;
  created_at?: string;
  simulated?: boolean;
};

export type CompetitorAd = {
  advertiser: string;
  copy: string;
  since?: string | null;
  simulated?: boolean;
};

export type KeywordIdea = {
  keyword: string;
  monthly_searches: number;
  cpc_usd: number;
  competition: string;
  simulated?: boolean;
};

export type TrendSignal = {
  term: string;
  direction: string;
  change_pct: number;
  window: string;
  simulated?: boolean;
};

export type AdsHub = {
  lead_interlink: {
    health: IntegrationHealth;
    connected: boolean;
    campaigns: AdCampaign[];
    leads: AdLead[];
  };
  salesforce: {
    health: IntegrationHealth;
    connected: boolean;
    leads: AdLead[];
  };
  intelligence: {
    live: boolean;
    competitor_ads: CompetitorAd[];
    keywords: KeywordIdea[];
    trends: TrendSignal[];
  };
};

/* ------------------------------ Invoicing ---------------------------------- */

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

/** One invoice row as the ledger presents it — money in integer cents (USD). */
export type Invoice = {
  id: number;
  client_name: string;
  client_email: string | null;
  amount_cents: number;
  status: InvoiceStatus;
  overdue: boolean;
  processor: string | null;
  external_ref: string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  updated_at: string | null;
};

/** The topic's invoicing ledger: outstanding-vs-paid totals + rows + processor mode. */
export type InvoicingLedger = {
  outstanding_cents: number;
  paid_cents: number;
  count: number;
  invoices: Invoice[];
  processor: IntegrationHealth;
};

/* ------------------------------- Services ---------------------------------- */

export type ServiceCategory =
  | "tax"
  | "legal"
  | "advertising"
  | "training"
  | "other";

/** One professional-services request (describe work → fulfillment → results). */
export type ServiceRequest = {
  id: number;
  category: ServiceCategory;
  body: string;
  status: string;
  provider: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** A topic's subscription to a catalog service. */
export type ServiceSubscription = {
  id: number;
  service_key: string;
  provider: string | null;
  status: string;
  simulated: boolean;
  created_at: string | null;
  updated_at: string | null;
};

/** One catalog service — {connected, simulated, mode} derived from its adapter. */
export type CatalogItem = {
  key: string;
  label: string;
  blurb: string;
  category: ServiceCategory;
  connected: boolean;
  simulated: boolean;
  mode: "mock" | "live";
};

/** The Services hub in one call: open requests, subscriptions, and the catalog. */
export type ServicesHub = {
  requests: ServiceRequest[];
  subscriptions: ServiceSubscription[];
  catalog: CatalogItem[];
};

/* ------------------------------- Partners ---------------------------------- */

/** The platform affiliate registration — a stable code + join link (D8). */
export type AffiliateRegistration = {
  id: number;
  affiliate_code: string;
  link: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

/** One referred-subscription attribution credited to the affiliate-of-record. */
export type AffiliateAttribution = {
  id: number;
  company_id: number | null;
  service_key: string;
  provider: string | null;
  status: string;
  amount_cents: number | null;
  created_at: string | null;
};

/** The Partners overview: registration (if any) + attributions + a rollup. */
export type PartnersOverview = {
  registration: AffiliateRegistration | null;
  attributions: AffiliateAttribution[];
  rollup: { count: number; recorded_cents: number };
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

  // Winslow team check-in — the latest coordination snapshot across the roster
  // (per-agent state + Winslow's notes), topic-scoped like the agent grid.
  teamStatus: (companyId?: string | number) =>
    request<TeamStatus>(
      `/team/status${cq(companyId)}`,
      companyId ? { headers: sigHeaders(companyId) } : {},
    ),
  // Manual trigger — run a fresh team check-in now and return it.
  teamCheckIn: (companyId?: string | number) =>
    request<TeamStatus>(`/team/check-in${cq(companyId)}`, {
      method: "POST",
      body: JSON.stringify({}),
      ...(companyId ? { headers: sigHeaders(companyId) } : {}),
    }),

  // Standard-schema agent profile(s) for one owned topic — role/model/skills/
  // loops/prompt-summary/cadence + the realign-override state. Session-authed,
  // owner-scoped (the /me/topics surface); the agent-detail view populates from
  // these so there is no hardcoded per-agent data in the front end.
  agentProfiles: (topicId: string | number) =>
    client.get<{ agents: AgentProfile[] }>(`/me/topics/${topicId}/agents`),
  agentProfile: (topicId: string | number, agentType: string) =>
    client.get<{ agent: AgentProfile }>(
      `/me/topics/${topicId}/agents/${agentType}`,
    ),

  // Realign an agent with a new prompt — reuses the imported-prompts mechanism
  // (scope='agent', mode='override'); PromptResolver applies it fail-safe to the
  // built-in. Delete the override to revert to the built-in prompt.
  realignAgent: (
    topicId: string | number,
    agentType: string,
    content: string,
    name?: string,
  ) =>
    client.post<ImportedPromptRow>(`/me/topics/${topicId}/prompts`, {
      scope: "agent",
      target_key: agentType,
      mode: "override",
      content,
      ...(name ? { name } : {}),
    }),
  deleteAgentPrompt: (topicId: string | number, promptId: number) =>
    client.del<{ deleted: boolean; id: number }>(
      `/me/topics/${topicId}/prompts/${promptId}`,
    ),

  // Grow an agent's profile: add a skill or a loop the owner defines. Both are
  // owner-scoped writes to the standard-schema profile (the same source the
  // agent-detail view reads back via `agentProfile`), so a refresh shows them.
  // NOTE: these two CYTAPI endpoints are the correlated backend still to build —
  // until they exist the calls 404 and the UI fails soft ("not yet available").
  addAgentSkill: (
    topicId: string | number,
    agentType: string,
    skill: { name: string; description?: string },
  ) =>
    client.post<{ agent: AgentProfile }>(
      `/me/topics/${topicId}/agents/${agentType}/skills`,
      skill,
    ),
  addAgentLoop: (
    topicId: string | number,
    agentType: string,
    loop: { name: string; trigger: string; behavior: string },
  ) =>
    client.post<{ agent: AgentProfile }>(
      `/me/topics/${topicId}/agents/${agentType}/loops`,
      loop,
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
      user_id: raw?.user_id,
      license: raw?.license,
      access_sig: raw?.access_sig,
      tagline: raw?.company?.value_prop,
      exec_summary: plan.summary ?? raw?.company?.mission,
      cycle_day: raw?.cycle_day,
      cycle_phase: raw?.cycle_phase,
      business_profile: raw?.business_profile,
      run_mode: raw?.run_mode,
      run_source: raw?.run_source,
      paused: raw?.paused,
      paused_at: raw?.paused_at,
      activity: raw?.activity,
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

  // KPI-tile drill-downs — the underlying items behind a dashboard stat tile,
  // company-scoped + signature-validated like the other topic surfaces.
  kpiTasksToday: (id: string): Promise<KpiTasksToday> =>
    request<KpiTasksToday>(`/topic/${id}/kpi/tasks-today`, {
      headers: sigHeaders(id),
    }),
  kpiFindings: (id: string): Promise<KpiFindings> =>
    request<KpiFindings>(`/topic/${id}/kpi/findings`, {
      headers: sigHeaders(id),
    }),
  kpiSpend: (id: string): Promise<KpiSpend> =>
    request<KpiSpend>(`/topic/${id}/kpi/spend`, { headers: sigHeaders(id) }),

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
  // Turn a recorded/typed description into structured context (goals, category tags,
  // target market, competitors) for the user to review, tweak, and save.
  extractContext: (id: string | number, transcript: string) =>
    client.post<{ extracted: ContextExtraction }>(
      `/me/topics/${id}/context/extract`,
      { transcript },
    ),
  // After a context save, Winslow reviews it and returns clarifying questions.
  probeContext: (id: string | number) =>
    client.post<{ questions: string[] }>(`/me/topics/${id}/context/probe`, {}),
  // Authenticator-app second factor (TOTP) for the signed-in user. Enroll →
  // confirm (activates, shows one-time recovery codes) → verify (step-up per
  // session for the admin surface) / disable.
  twoFactor: {
    status: () => client.get<TwoFactorStatus>("/me/2fa"),
    enroll: () => client.post<TwoFactorEnroll>("/me/2fa/enroll"),
    confirm: (code: string) =>
      client.post<{ enabled: boolean; recovery_codes: string[] }>(
        "/me/2fa/confirm",
        { code },
      ),
    verify: (code: string) =>
      client.post<{ verified: boolean }>("/me/2fa/verify", { code }),
    disable: (code: string) =>
      client.post<{ enabled: boolean }>("/me/2fa/disable", { code }),
  },
  // Push-to-talk / typed cue → Winslow triages it and routes it to the right
  // specialist agent's queue (owner-scoped). Returns his triage ticket + the
  // routed task (once the triage has run).
  cueWinslow: (id: string | number, text: string) =>
    client.post<CueResult>(`/me/topics/${id}/cue`, { text }),
  // Set the project's daily spend cap (from the Overview effort presets).
  setTopicSpendCap: (id: string | number, amount: number | null) =>
    client.put<{ spend_cap_usd: number | null }>(`/me/topics/${id}/spend-cap`, {
      amount,
    }),
  // Roadmap queue — the observable, priority-ordered ledger of feature
  // enhancements the team works through. Winslow advances it during his cycles
  // (reads it at boot as Markdown); the owner reads it here and can nudge: place
  // an entry, reprioritize, or advance a status.
  roadmap: (id: string | number) =>
    client.get<RoadmapLedger>(`/me/topics/${id}/roadmap`),
  // Public PRODUCT roadmap — ChooseYourTopic's own dev queue (platform scope).
  platformRoadmap: () => client.get<RoadmapLedger>("/roadmap"),
  placeRoadmapEntry: (
    id: string | number,
    entry: { title: string; description?: string; priority?: number },
  ) => client.post<RoadmapEntry>(`/me/topics/${id}/roadmap`, entry),
  reprioritizeRoadmapEntry: (
    id: string | number,
    entryId: number,
    priority: number,
  ) =>
    client.put<RoadmapEntry>(`/me/topics/${id}/roadmap/${entryId}/priority`, {
      priority,
    }),
  setRoadmapEntryStatus: (
    id: string | number,
    entryId: number,
    status: RoadmapStatus,
    release_note?: string,
  ) =>
    client.post<RoadmapEntry>(`/me/topics/${id}/roadmap/${entryId}/status`, {
      status,
      ...(release_note ? { release_note } : {}),
    }),

  // Interactive per-topic goals (daily / weekly / monthly momentum steps).
  topicGoals: (id: string | number) =>
    client.get<{ goals: TopicGoals }>(`/me/topics/${id}/goals`),
  // Plan board — the five plan deliverables + earned badges (auto from agent work).
  topicPlan: (id: string | number) =>
    client.get<{ plans: PlanAchievementItem[] }>(`/me/topics/${id}/plan`),
  // Trophy shelf — every badge the topic can earn (plan + milestone), earned + locked.
  topicAchievements: (id: string | number) =>
    client.get<AchievementShelf>(`/me/topics/${id}/achievements`),
  // Agent team — the stock 9 plus any added-on agents; add/remove the addable ones.
  topicTeam: (id: string | number) =>
    client.get<AgentTeam>(`/me/topics/${id}/team`),
  // Agent-of-record — an agent's identity/charter + its recallable body of work.
  agentRecord: (id: string | number, agentType: string) =>
    client.get<AgentRecord>(`/me/topics/${id}/agents/${agentType}/record`),
  addTopicAgent: (id: string | number, agent_type: string) =>
    client.post<AgentTeam>(`/me/topics/${id}/team`, { agent_type }),
  removeTopicAgent: (id: string | number, agentType: string) =>
    client.del<AgentTeam>(`/me/topics/${id}/team/${agentType}`),
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

  // Competitive milestone leaderboard — the global 29-day business race. Ranks
  // only opted-in topics, privacy-safe; server-side ranked/filtered/paginated.
  leaderboard: (filters: LeaderboardFilters = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return client.get<LeaderboardResponse>(
      `/leaderboard${qs ? `?${qs}` : ""}`,
    );
  },
  // A single topic's own race standing + opt-in flag (owner-scoped).
  topicLeaderboard: (id: string | number) =>
    client.get<TopicLeaderboard>(`/me/topics/${id}/leaderboard`),
  // Opt a topic in/out of the public leaderboard (default OFF for privacy).
  setLeaderboardOptIn: (id: string | number, optIn: boolean) =>
    client.put<{ opt_in: boolean }>(`/me/topics/${id}/leaderboard`, {
      opt_in: optIn,
    }),

  // Per-topic integrations — connect a service with a token / secret key. The
  // secret is stored encrypted server-side and never returned (status only). The
  // optional `masked_key` is a display-only masked identifier (e.g. "sk_…4f2a")
  // the backend MAY return so the UI can show which credential is connected —
  // it renders only when present, so this stays backward-compatible until the
  // backend populates it.
  topicIntegrations: (id: string | number) =>
    client.get<{ connections: IntegrationConnection[] }>(
      `/me/topics/${id}/integrations`,
    ),

  // Ads page hub — Lead Interlink campaigns/leads + Salesforce CRM leads.
  adsHub: (id: string | number) => client.get<AdsHub>(`/me/topics/${id}/ads-hub`),
  pushAdsContext: (id: string | number) =>
    client.post<{ ok: boolean; simulated?: boolean }>(
      `/me/topics/${id}/ads-hub/push-context`,
    ),
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

  // Invoicing ledger — outstanding/paid totals, rows, and the processor mode.
  invoicing: (id: string | number) =>
    client.get<InvoicingLedger>(`/me/topics/${id}/invoicing`),
  createInvoice: (
    id: string | number,
    body: {
      client_name: string;
      client_email?: string;
      amount_cents: number;
      status?: InvoiceStatus;
      due_at?: string;
    },
  ) => client.post<Invoice>(`/me/topics/${id}/invoicing`, body),
  updateInvoice: (
    id: string | number,
    invoiceId: number,
    body: { status: InvoiceStatus },
  ) => client.patch<Invoice>(`/me/topics/${id}/invoicing/${invoiceId}`, body),

  // Services hub — catalog + a topic's requests + subscriptions.
  services: (id: string | number) =>
    client.get<ServicesHub>(`/me/topics/${id}/services`),
  submitServiceRequest: (
    id: string | number,
    body: { category: ServiceCategory; body: string },
  ) => client.post<ServiceRequest>(`/me/topics/${id}/services/requests`, body),
  subscribeService: (
    id: string | number,
    body: { service_key: string; provider?: string },
  ) =>
    client.post<ServiceSubscription>(`/me/topics/${id}/services/subscribe`, body),
  // Unsubscribe soft-cancels then returns the refreshed hub.
  unsubscribeService: (id: string | number, serviceKey: string) =>
    client.del<ServicesHub>(
      `/me/topics/${id}/services/subscribe/${serviceKey}`,
    ),

  // Partners — one-click affiliate registration + attribution overview (D8/D9).
  partners: () => client.get<PartnersOverview>("/me/partners"),
  // Register is idempotent and returns just the registration; refetch partners()
  // for the full overview after.
  registerPartner: () =>
    client.post<AffiliateRegistration>("/me/partners/register"),

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

  // Operations MCP token — one revocable, per-user bearer for driving the owner's
  // topics from their own Claude (Claude Code). `mint` mints/rotates and returns
  // the plaintext ONCE; `get` is masked status only; `revoke` fails it closed.
  mcpToken: {
    get: () => client.get<McpTokenStatus>("/me/mcp-token"),
    mint: () => client.post<McpTokenMint>("/me/mcp-token"),
    revoke: () => client.del<{ connected: boolean }>("/me/mcp-token"),
  },

  // Bring-your-own AI credential — connect an API key or an OAuth account so the
  // user's agent usage runs on their own account.
  aiCredential: {
    get: () => client.get<AiCredential>("/me/ai-credential"),
    saveApiKey: (apiKey: string, provider?: AiProvider) =>
      client.put<AiCredential>("/me/ai-credential/api-key", {
        api_key: apiKey,
        ...(provider ? { provider } : {}),
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

  // Provider LADDER — every connected provider in priority order; the engine
  // cascades down it on exhaustion. List, reorder, and remove a rung.
  aiCredentials: {
    list: () => client.get<{ ladder: LadderRung[] }>("/me/ai-credentials"),
    reorder: (providers: AiProvider[]) =>
      client.put<{ ladder: LadderRung[] }>("/me/ai-credentials/order", {
        providers,
      }),
    disconnect: (provider: AiProvider) =>
      client.del<{ ladder: LadderRung[] }>(`/me/ai-credentials/${provider}`),
    // Per-provider usage (spend/tokens/runs, today + all-time) for the Models tiles.
    usage: () => client.get<{ providers: ProviderUsage[] }>("/me/ai-usage"),
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
