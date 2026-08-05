// Integration catalog — the services a topic can connect, the token/secret-key
// fields each needs, and the sign-up link for users who don't have an account.
//
// ⚠️ AFFILIATE LINKS — maintained by the Medium & Social Media team. Each
// `affiliateUrl` below is a PLACEHOLDER pointing at the service's normal sign-up
// page. Replace it with the Kuykendall Empire referral/affiliate link for that
// service (where a program exists) so sign-ups earn ad revenue for continued
// development. Keep them all here, in one place.

export type IntegrationField = {
  key: string;
  label: string;
  placeholder?: string;
};

export type IntegrationDef = {
  key: string; // must match the backend provider whitelist
  name: string;
  category: string;
  desc: string;
  color: string;
  initial: string;
  // The token/secret-key fields the user enters to connect.
  fields: IntegrationField[];
  // Where to sign up (affiliate/referral link — see note above).
  affiliateUrl: string;
  // Where the user finds the token/key in that service.
  docsUrl: string;
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "xtkrecall_mcp",
    name: "XTKRecall MCP",
    category: "Knowledge",
    desc: "Connect your XTKRecall vault over MCP — bring your agents, skills, and context.",
    color: "#7C3AED",
    initial: "X",
    fields: [
      { key: "endpoint", label: "MCP endpoint URL", placeholder: "http://127.0.0.1:27123/mcp/" },
      { key: "api_key", label: "API key (optional)", placeholder: "…" },
    ],
    affiliateUrl: "https://xtkrecall.com/",
    docsUrl: "https://xtkrecall.com/",
  },
  {
    key: "twilio",
    name: "Twilio",
    category: "Communications",
    desc: "SMS, voice, and phone verification.",
    color: "#F22F46",
    initial: "T",
    fields: [
      { key: "account_sid", label: "Account SID", placeholder: "AC…" },
      { key: "auth_token", label: "Auth token", placeholder: "your secret token" },
    ],
    affiliateUrl: "https://www.twilio.com/try-twilio",
    docsUrl: "https://console.twilio.com/",
  },
  {
    key: "supabase",
    name: "Supabase",
    category: "Data & Backend",
    desc: "Postgres database, auth, and storage.",
    color: "#3ECF8E",
    initial: "S",
    fields: [
      { key: "project_url", label: "Project URL", placeholder: "https://xyz.supabase.co" },
      { key: "service_role_key", label: "Service role key", placeholder: "eyJ…" },
    ],
    affiliateUrl: "https://supabase.com/dashboard/sign-up",
    docsUrl: "https://supabase.com/dashboard/project/_/settings/api",
  },
  {
    key: "digitalocean",
    name: "DigitalOcean",
    category: "Infrastructure",
    desc: "Deploy and host your app and services.",
    color: "#0080FF",
    initial: "D",
    fields: [{ key: "api_token", label: "API token", placeholder: "dop_v1_…" }],
    affiliateUrl: "https://www.digitalocean.com/",
    docsUrl: "https://cloud.digitalocean.com/account/api/tokens",
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "Payments",
    desc: "Accept payments and manage subscriptions.",
    color: "#635BFF",
    initial: "S",
    fields: [{ key: "secret_key", label: "Secret key", placeholder: "sk_live_…" }],
    affiliateUrl: "https://dashboard.stripe.com/register",
    docsUrl: "https://dashboard.stripe.com/apikeys",
  },
  {
    key: "sendgrid",
    name: "SendGrid",
    category: "Communications",
    desc: "Transactional and marketing email.",
    color: "#1A82E2",
    initial: "S",
    fields: [{ key: "api_key", label: "API key", placeholder: "SG.…" }],
    affiliateUrl: "https://signup.sendgrid.com/",
    docsUrl: "https://app.sendgrid.com/settings/api_keys",
  },
  {
    key: "github",
    name: "GitHub",
    category: "Development",
    desc: "Source control + CI for the build agent.",
    color: "#8B949E",
    initial: "G",
    fields: [{ key: "personal_access_token", label: "Personal access token", placeholder: "ghp_…" }],
    affiliateUrl: "https://github.com/signup",
    docsUrl: "https://github.com/settings/tokens",
  },
  {
    key: "x_twitter",
    name: "X (Twitter)",
    category: "Marketing",
    desc: "Publish the social posts your agents draft.",
    color: "#1DA1F2",
    initial: "X",
    fields: [{ key: "bearer_token", label: "Bearer token", placeholder: "AAAA…" }],
    affiliateUrl: "https://developer.x.com/en/portal/petition/essential/basic-info",
    docsUrl: "https://developer.x.com/en/portal/dashboard",
  },
  {
    key: "google_ads",
    name: "Google Ads",
    category: "Marketing",
    desc: "Run and manage ad campaigns.",
    color: "#FBBC05",
    initial: "G",
    fields: [{ key: "developer_token", label: "Developer token", placeholder: "…" }],
    affiliateUrl: "https://ads.google.com/",
    docsUrl: "https://developers.google.com/google-ads/api/docs/first-call/dev-token",
  },
  {
    key: "slack",
    name: "Slack",
    category: "Notifications",
    desc: "Get project updates where your team works.",
    color: "#4A154B",
    initial: "S",
    fields: [{ key: "bot_token", label: "Bot token", placeholder: "xoxb-…" }],
    affiliateUrl: "https://slack.com/get-started",
    docsUrl: "https://api.slack.com/apps",
  },
];
