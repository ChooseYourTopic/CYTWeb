import { clsx, type ClassValue } from "clsx";

/** Tiny class-name joiner. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Product-facing display names for agent types whose presented name differs
 * from the humanized id. The internal agent_type id ("orchestrator") is
 * unchanged — only the label shown to owners is overridden.
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  orchestrator: "Winslow",
  winslow_prime: "Winslow Prime",
  // Specialist library (addable beyond the stock 9).
  front_end_developer: "Front-End Developer",
  back_end_developer: "Back-End Developer",
  email_marketing_analyst: "Email Marketing Analyst",
  research_analyst: "Research Analyst",
  brand_designer: "Brand & Visual Designer",
  seo_specialist: "SEO Specialist",
  copywriter: "Conversion Copywriter",
  data_analyst: "Data & Analytics Analyst",
};

/** Turn an agent_type / section key into a human label. */
export function label(id: string): string {
  if (AGENT_DISPLAY_NAMES[id]) return AGENT_DISPLAY_NAMES[id];
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a currency amount stored in cents. */
export function fromCents(cents: number | null | undefined): string {
  if (cents == null) return "$0.00";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Best-effort relative-ish timestamp for feed rows. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}
