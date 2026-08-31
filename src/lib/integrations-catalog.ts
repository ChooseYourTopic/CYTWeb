// Empire Bridge — the directory of Empire platforms that CONSUME ChooseYourTopic's data.
//
// ChooseYourTopic is a bridge PROVIDER: other Empire apps (QuickerBiz, ResyBlack, …) pull
// this owner's topic + customer records ONE-WAY, read-only, over the Empire Integration
// Bridge. Every tile here is therefore an INBOUND consumer — its View/Setup how-to issues a
// scoped read-only bridge key against CYT (the same `cytapi.bridgeKeys.issue` engine the
// Settings "API Access — Empire Bridge" card uses), which the owner pastes into that
// consumer's own bridge console pointed at CYT's base URL. CYT never receives writes.
//
// This is a single data-driven catalog: each tile + its detail page renders generically from
// one entry (name → consumer slug used as the `partner` at key issuance).

export type ConsumerStage = "live" | "available";

export interface Consumer {
  name: string;
  slug: string; // partner slug passed to bridge-key issuance (e.g. "quickerbiz")
  blurb: string;
  stage: ConsumerStage; // "live" = the consumer's pull side is fully wired; else key-ready
  tags: string[];
  pasteStep?: string; // optional per-consumer override of the generic "where to paste" step
}

// Base URL a consumer points its bridge console at to reach the ChooseYourTopic API.
export const BRIDGE_BASE_URL = "https://chooseyourtopic.com";

// The Empire portfolio as INBOUND bridge consumers of ChooseYourTopic. NOTE: ChooseYourTopic
// itself is intentionally absent — a provider does not consume its own data. QuickerBiz is
// fully live; the others can be issued a key today and light up as each platform's pull side
// is wired.
export const CONSUMERS: Consumer[] = [
  {
    name: "QuickerBiz",
    slug: "quickerbiz",
    blurb:
      "Let QuickerBiz pull your ChooseYourTopic topics and customer records one-way (read-only).",
    stage: "live" as const,
    pasteStep:
      "In QuickerBiz, open the Empire Bridge console at /dashboard/bridge and choose ChooseYourTopic.",
    tags: ["quickerbiz", "hub", "portal"],
  },
  {
    name: "ResyBlack",
    slug: "resyblack",
    blurb:
      "Let ResyBlack pull your ChooseYourTopic topics and customer records one-way (read-only).",
    stage: "available" as const,
    tags: ["resyblack", "reservations", "crm"],
  },
  {
    name: "Collect2Play",
    slug: "collect2play",
    blurb:
      "Let Collect2Play pull your ChooseYourTopic topics and customer records one-way (read-only).",
    stage: "available" as const,
    tags: ["collect2play", "collectibles", "brackets"],
  },
  {
    name: "SloppyCards",
    slug: "sloppycards",
    blurb:
      "Let SloppyCards pull your ChooseYourTopic topics and customer records one-way (read-only).",
    stage: "available" as const,
    tags: ["sloppycards", "cards", "collectibles"],
  },
  {
    name: "Tracercoin",
    slug: "tracercoin",
    blurb:
      "Let Tracercoin pull your ChooseYourTopic topics and customer records one-way (read-only).",
    stage: "available" as const,
    tags: ["tracercoin", "tfx", "blockchain", "crypto"],
  },
].map((c) => ({
  ...c,
  // Every consumer is findable by name + slug and shares the "data access" language.
  tags: [
    "empire",
    "bridge",
    "consumer",
    "data access",
    "read-only",
    "inbound",
    "topics",
    "customers",
    "sync",
    c.slug,
    ...c.tags,
  ],
}));

export const STAGE_LABEL: Record<ConsumerStage, string> = {
  live: "Live",
  available: "Available",
};

export function findConsumer(slug: string): Consumer | undefined {
  return CONSUMERS.find((c) => c.slug === slug);
}

export interface ConsumerSetup {
  steps: string[]; // manual how-to
  prompts: string[]; // paste-to-your-agent prompts to finish the task
}

// Setup guide for an inbound Empire bridge consumer. The only per-consumer differences are the
// name and the paste-destination step; the issuance, base URL, and test/pull flow are identical.
export function setupFor(c: Consumer): ConsumerSetup {
  return {
    steps: [
      "Issue a scoped read-only key below — the api key + signing secret are shown only once, so copy them now.",
      c.pasteStep ??
        `In ${c.name}, open its Empire Bridge console and choose ChooseYourTopic.`,
      `Enter the base URL ${BRIDGE_BASE_URL} and paste your key.`,
      `Click Test connection, then Pull — ${c.name} reads your topics and customers one-way.`,
    ],
    prompts: [
      `Issue a read-only ChooseYourTopic bridge key so ${c.name} can pull my topics and customers.`,
    ],
  };
}
