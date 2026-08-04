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
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
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
  | "context"
  | "integrations"
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
  // How this topic's agents run: live on the owner's account vs preview/mock.
  run_mode?: "live" | "preview";
  run_source?: "user" | "platform" | "none";
  // Soft-shutdown (pause) state for this topic.
  paused?: boolean;
  paused_at?: string | null;
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

export type ViewMode = "standard" | "advanced";

export type AiExperience = "new" | "advanced";
export type BusinessExperience = "new" | "experienced";

export type UserPreferences = {
  timezone: string | null;
  daily_budget_usd: number | null;
  platform_daily_budget_usd: number;
  // Dashboard density: standard = core five tabs, advanced = every tab.
  view_mode: ViewMode;
  // Onboarding persona — the user's starting point ("first context").
  ai_experience: AiExperience | null;
  business_experience: BusinessExperience | null;
};

export type MeProfile = {
  id: number;
  name: string | null;
  nickname: string | null;
  show_nickname: boolean;
  // Identity shown across the app: nickname (if opted in) else account name.
  display_name: string | null;
  phone: string | null;
  email: string | null;
  is_admin: boolean;
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

export const cytapi = {
  // Landing → seed the company from one line.
  createTopic: (topic: string) =>
    client.post<CreateTopicResponse>("/onboarding/topic", { topic }),

  // Dashboard KPIs.
  dashboardSummary: () => client.get<DashboardSummary>("/dashboard/summary"),

  // Agent status grid (polled by useAgentStatus), scoped to a topic/company.
  agentStatus: (companyId?: string | number) =>
    client.get<AgentStatus[]>(`/agents/status${cq(companyId)}`),

  // Full working picture for one agent: skills, queue, process (runs), actions.
  agentDetail: (agentType: string, companyId?: string | number) =>
    client.get<AgentDetail>(`/agents/${agentType}/detail${cq(companyId)}`),

  // Kick a one-off run of an agent for a topic (manual trigger).
  agentTrigger: (agentType: string, companyId?: string | number) =>
    client.post<{ message: string }>(`/agents/${agentType}/trigger${cq(companyId)}`),

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
    client.get<FinanceSummary>(`/finance/summary${cq(companyId)}`),

  // Living-report topic surfaces — normalized from the backend's domain shapes.
  topicOverview: async (id: string): Promise<TopicOverview> => {
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
      run_mode: raw?.run_mode,
      run_source: raw?.run_source,
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

  // Backfill activity events missed across a WS reconnect, scoped to a topic.
  activitySince: (sinceId: number, companyId?: string | number) =>
    client.get<ActivityEvent[]>(
      `/activity?since=${sinceId}${companyId ? `&company_id=${companyId}` : ""}`,
    ),

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
  updateProfile: (patch: {
    name?: string | null;
    nickname?: string | null;
    show_nickname?: boolean;
    email?: string | null;
  }) => client.put<MeProfile>("/me", patch),
  updatePreferences: (patch: {
    timezone?: string | null;
    daily_budget_usd?: number | null;
    view_mode?: ViewMode;
    ai_experience?: AiExperience | null;
    business_experience?: BusinessExperience | null;
  }) => client.put<UserPreferences>("/me/preferences", patch),

  // Bring-your-own AI credential — connect an API key or an OAuth account so the
  // user's agent usage runs on their own account.
  aiCredential: {
    get: () => client.get<AiCredential>("/me/ai-credential"),
    saveApiKey: (apiKey: string) =>
      client.put<AiCredential>("/me/ai-credential/api-key", {
        api_key: apiKey,
      }),
    disconnect: () => client.del<{ connected: boolean }>("/me/ai-credential"),
    oauthStart: () =>
      client.post<{ authorize_url: string }>("/me/ai-credential/oauth/start"),
    oauthCallback: (code: string, state: string) =>
      client.post<AiCredential>("/me/ai-credential/oauth/callback", {
        code,
        state,
      }),
  },
};
