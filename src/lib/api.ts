// Typed CYTAPI client (clean-room). Talks to ${NEXT_PUBLIC_API_URL}/api/v1 with
// an X-API-Key header. Every helper is fail-soft friendly: callers wrap in
// try/catch and fall back to skeletons when the backend is not up.

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...options.headers,
    },
    // Send/receive the session cookie set by the SMS auth flow so the signed-in
    // user's own surfaces (/me/*) and topic ownership work. Same-origin in prod.
    credentials: "include",
    // Live dashboard data must never be statically cached.
    cache: "no-store",
  });
  if (!res.ok) {
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
};

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
  tasks_today: number;
  tasks_total: number;
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
  | "build";

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
};

export type TopicOverview = {
  topic: string;
  tagline?: string;
  cycle_day?: number;
  cycle_phase?: string;
  exec_summary?: string;
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

/* ------------------------- Signed-in user (me) ---------------------------- */

export type MeProfile = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  is_admin: boolean;
  topics_count: number;
  joined_at: string | null;
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
  last_activity_at: string | null;
  created_at: string | null;
};

export type MyTopicsResponse = {
  user: { id: number; name: string | null; phone: string | null };
  count: number;
  topics: MyTopic[];
};

/* ------------------------------ API surface ------------------------------- */

export const cytapi = {
  // Landing → seed the company from one line.
  createTopic: (topic: string) =>
    client.post<CreateTopicResponse>("/onboarding/topic", { topic }),

  // Dashboard KPIs.
  dashboardSummary: () => client.get<DashboardSummary>("/dashboard/summary"),

  // Agent status grid (polled by useAgentStatus).
  agentStatus: () => client.get<AgentStatus[]>("/agents/status"),

  // Tasks list (Decisions panel).
  tasks: (limit = 100) => client.get<Task[]>(`/tasks?limit=${limit}`),

  // Finance snapshot (spend / MRR tiles).
  financeSummary: () => client.get<FinanceSummary>("/finance/summary"),

  // Living-report topic surfaces (additive; fail-soft to placeholders).
  topicOverview: (id: string) =>
    client.get<TopicOverview>(`/topic/${id}/overview`),
  section: (id: string, section: FetchableSection) =>
    client.get<SectionItem[]>(`/topic/${id}/${section}`),

  // Daily report artifacts.
  reports: (limit = 20) => client.get<DailyReport[]>(`/reports?limit=${limit}`),
  report: (id: string) => client.get<DailyReport>(`/reports/${id}`),

  // Backfill activity events missed across a WS reconnect.
  activitySince: (sinceId: number) =>
    client.get<ActivityEvent[]>(`/activity?since=${sinceId}`),

  // Phone-first SMS-code auth. Fail-soft in the UI until CYTAPI ships these.
  auth: {
    requestSmsCode: (phone: string) =>
      client.post<{ sent: boolean }>("/auth/sms/request", { phone }),
    verifySmsCode: (phone: string, code: string) =>
      client.post<{ authenticated: boolean }>("/auth/sms/verify", {
        phone,
        code,
      }),
    session: () =>
      client.get<{ authenticated: boolean; phone?: string; is_admin?: boolean }>(
        "/auth/session",
      ),
    logout: () => client.post<void>("/auth/logout"),
  },

  // The signed-in user's own surfaces (session-backed; require credentials).
  me: () => client.get<MeProfile>("/me"),
  myTopics: () => client.get<MyTopicsResponse>("/me/topics"),
};
