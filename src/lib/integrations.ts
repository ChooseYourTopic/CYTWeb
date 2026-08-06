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
    desc: "A managed, hosted knowledge & memory vault over MCP — we provision it for you.",
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
      { key: "api_key_sid", label: "API key SID", placeholder: "SK…" },
      { key: "api_key_secret", label: "API key secret", placeholder: "your API key secret" },
      { key: "verify_service_sid", label: "Verify service SID", placeholder: "VA…" },
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
      { key: "anon_key", label: "Anon public key", placeholder: "eyJ…" },
      { key: "service_role_key", label: "Service role key (secret)", placeholder: "eyJ…" },
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
    fields: [
      { key: "secret_key", label: "Secret key", placeholder: "sk_live_…" },
      { key: "webhook_secret", label: "Webhook signing secret", placeholder: "whsec_…" },
    ],
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
    fields: [
      { key: "api_key", label: "API key", placeholder: "SG.…" },
      { key: "from_email", label: "From email", placeholder: "hello@yourdomain.com" },
    ],
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
    fields: [
      { key: "api_key", label: "API key (consumer key)", placeholder: "…" },
      { key: "api_secret", label: "API key secret", placeholder: "…" },
      { key: "access_token", label: "Access token", placeholder: "…" },
      { key: "access_secret", label: "Access token secret", placeholder: "…" },
    ],
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
    fields: [
      { key: "developer_token", label: "Developer token", placeholder: "…" },
      { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890" },
      { key: "access_token", label: "OAuth access token", placeholder: "ya29.…" },
    ],
    affiliateUrl: "https://ads.google.com/",
    docsUrl: "https://developers.google.com/google-ads/api/docs/first-call/dev-token",
  },
  {
    key: "meta_ads",
    name: "Meta Ads",
    category: "Marketing",
    desc: "Run and manage Facebook & Instagram ad campaigns.",
    color: "#0866FF",
    initial: "M",
    fields: [
      { key: "access_token", label: "Access token", placeholder: "EAAG…" },
      { key: "ad_account_id", label: "Ad account ID", placeholder: "act_1234567890" },
    ],
    affiliateUrl: "https://www.facebook.com/business/tools/meta-business-suite",
    docsUrl: "https://developers.facebook.com/tools/explorer/",
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
  {
    key: "voices",
    name: "Voices (TTS)",
    category: "Voice",
    desc: "Speak your agents' cheeky challenge lines + narration in a voice you pick.",
    color: "#EC4899",
    initial: "V",
    fields: [
      { key: "endpoint", label: "TTS endpoint URL", placeholder: "http://127.0.0.1:8880" },
      { key: "api_key", label: "API key (optional for a local server)", placeholder: "…" },
      { key: "voice_id", label: "Default voice id", placeholder: "bm_lewis" },
    ],
    affiliateUrl: "https://github.com/remsky/Kokoro-FastAPI",
    docsUrl: "https://github.com/remsky/Kokoro-FastAPI",
  },
];
