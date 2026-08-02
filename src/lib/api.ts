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
  // A steering action the user can take on this item (maps item.id → an endpoint).
  action?: "publish" | "send" | "launch";
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

/* --------------------------- Section normalizers --------------------------- */
// The backend returns domain-shaped section payloads (e.g. { section, posts })
// while the dashboard renders a flat SectionItem[]. These map one to the other
// and attach the steering action (publish/send/launch) each item supports.

function truncate(s: string, n: number): string {
  s = (s ?? "").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSection(section: FetchableSection, raw: any): SectionItem[] {
  switch (section) {
    case "competitors":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Living-report topic surfaces — normalized from the backend's domain shapes.
  topicOverview: async (id: string): Promise<TopicOverview> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await client.get(`/topic/${id}/overview`);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      kpis: raw?.kpis ?? {},
      spark: raw?.spark ?? [],
      items,
    };
  },
  section: async (
    id: string,
    section: FetchableSection,
  ): Promise<SectionItem[]> =>
    normalizeSection(section, await client.get(`/topic/${id}/${section}`)),

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
