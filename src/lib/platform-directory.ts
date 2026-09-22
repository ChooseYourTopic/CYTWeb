// Platform directory for key/token issuance — the pick-list a user chooses from when
// tagging an issued credential (bridge key OR AI-model token) to the platform they
// intend to use it with (Tracy 2026-09-22, enhancement #4). Two groups:
//
//   (a) EMPIRE   — every Kuykendall Empire product, so a key can be tagged to the
//                  in-Empire app it's meant for (including ChooseYourTopic itself —
//                  e.g. an AI-model token that just powers this account's own agents).
//   (b) EXTERNAL — third-party partner-adapter placeholders (QuickBooks, Zoho, …) for
//                  keys/tokens meant for an outside platform, not a Kuykendall product.
//
// Distinct from `integrations.ts` (the "connect a 3rd-party service to power your
// topic" catalog — Twilio/Stripe/Slack/etc.) and from `integrations-catalog.ts` (the
// inbound Empire-bridge-CONSUMER tile directory). This is the general-purpose
// "what platform is this credential for" directory shared by every issuance surface.

export type PlatformGroup = "empire" | "external";

export interface PlatformOption {
  slug: string; // sent as bridge-key `partner` / ai-credential `platform`
  label: string;
  group: PlatformGroup;
}

// Every Kuykendall Empire product (every enterprise integration we ship).
export const EMPIRE_PLATFORMS: PlatformOption[] = [
  { slug: "quickerbiz", label: "QuickerBiz", group: "empire" },
  { slug: "venuetool", label: "VenueTool", group: "empire" },
  { slug: "resyblack", label: "ResyBlack", group: "empire" },
  { slug: "lead_interlink", label: "Lead Interlink", group: "empire" },
  { slug: "chooseyourtopic", label: "ChooseYourTopic", group: "empire" },
  { slug: "collect2play", label: "Collect2Play", group: "empire" },
  { slug: "cartpath", label: "CartPath", group: "empire" },
];

// External third-party partner-adapter placeholders — grows over time without a
// backend deploy (the platform field is free-form, not enum-constrained).
export const EXTERNAL_PLATFORMS: PlatformOption[] = [
  { slug: "quickbooks", label: "QuickBooks", group: "external" },
  { slug: "zoho", label: "Zoho", group: "external" },
  { slug: "gusto", label: "Gusto", group: "external" },
  { slug: "plaid", label: "Plaid", group: "external" },
  { slug: "salesforce", label: "Salesforce", group: "external" },
  { slug: "hubspot", label: "HubSpot", group: "external" },
];

export const ALL_PLATFORMS: PlatformOption[] = [...EMPIRE_PLATFORMS, ...EXTERNAL_PLATFORMS];

// Sentinel for "not in the directory — let me type a slug".
export const OTHER_PLATFORM = "__other__";

// The account's own agents — the AI-credential default when the user doesn't pick one
// (mirrors the backend default in MeCredentialController::saveApiKey).
export const DEFAULT_AI_PLATFORM = "chooseyourtopic";

/** Friendly label for a platform slug (falls back to the raw slug for custom/unlisted ones). */
export function platformLabel(slug: string | null | undefined): string {
  if (!slug) return DEFAULT_AI_PLATFORM;
  const known = ALL_PLATFORMS.find((p) => p.slug === slug);
  return known?.label ?? slug;
}
