// Data-driven branding so a rebrand is a single-file change and the palette
// swaps in one place (globals.css :root tokens, mirrored here for JS use).

export const BRAND = {
  APP_NAME: "ChooseYourTopic",
  MARK: "C",
  TAGLINE: "One line to start.",
  SUBTAGLINE:
    "Give ChooseYourTopic a topic. An autonomous agent team researches, builds, markets, and runs it in the background — while you stay in a living dashboard and keep investigating as results come in.",
  // Primary accent (kept in sync with --brand / --brand2 in globals.css).
  PRIMARY: "#6ea8fe",
  PRIMARY_2: "#8b7bff",
} as const;

export const SAMPLE_TOPICS = [
  "a subscription box for rare hot sauces",
  "an AI tutor for high-school chemistry",
  "handmade leather dog collars",
  "a newsletter about small-town food scenes",
  "budgeting app for freelancers",
];
