// Curated topic ideas by category — shared by the "help me choose" page and the
// onboarding /start step-2 picker. A static starter set (AI-personalized
// recommendations can layer on later).

export type IdeaCategory = { category: string; ideas: string[] };

export const TOPIC_CATALOG: IdeaCategory[] = [
  {
    category: "Food & Drink",
    ideas: [
      "a subscription box for rare hot sauces",
      "a ghost kitchen for late-night comfort food",
      "a specialty coffee roaster for home baristas",
    ],
  },
  {
    category: "Retail & Ecommerce",
    ideas: [
      "a curated shop for sustainable home goods",
      "a marketplace for handmade pet accessories",
      "a print-on-demand brand for indie book lovers",
    ],
  },
  {
    category: "Services",
    ideas: [
      "a mobile car-detailing service for busy professionals",
      "a same-day plant-care and delivery service",
      "a concierge booking service for local experiences",
    ],
  },
  {
    category: "Tech & Apps",
    ideas: [
      "an app that turns receipts into budgeting insights",
      "a scheduling tool for small fitness studios",
      "a habit tracker that rewards streaks with real perks",
    ],
  },
  {
    category: "Creative & Media",
    ideas: [
      "a newsletter about small-town food scenes",
      "a podcast network for niche hobbies",
      "a stock-video marketplace for creators",
    ],
  },
  {
    category: "Health & Wellness",
    ideas: [
      "a meal-prep service for specific diets",
      "a booking platform for community yoga classes",
      "a sleep-coaching app with wearable sync",
    ],
  },
  {
    category: "Events",
    ideas: [
      "a balloon and decor company for artistic delivery",
      "a pop-up dinner series for local chefs",
      "a platform for booking backyard micro-weddings",
    ],
  },
  {
    category: "Education",
    ideas: [
      "a tutoring marketplace for coding bootcamp grads",
      "a language-exchange app with live partners",
      "a course platform for hands-on trades",
    ],
  },
  {
    category: "Music & Entertainment",
    ideas: [
      "a subscription box for vinyl record collectors",
      "an app that books local live music gigs",
      "a platform for indie artists to sell merch",
    ],
  },
  {
    category: "Art & Design",
    ideas: [
      "a marketplace for custom digital portraits",
      "a print-on-demand shop for indie illustrators",
      "an app that matches homeowners with local muralists",
    ],
  },
  {
    category: "Games, Trivia & Puzzles",
    ideas: [
      "a mobile trivia app with real cash prizes",
      "a subscription box of indie tabletop games",
      "a daily puzzle app for word-game lovers",
    ],
  },
  {
    category: "Just for Fun",
    ideas: [
      "a dating app for houseplants",
      "a bakery that only sells corner pieces",
      "socks engineered to never lose their pair",
      "an umbrella that texts you before it rains",
      "alarm clocks that only stop after a push-up",
      "a translator for what your cat's meow really means",
      "noise-cancelling headphones for your inner critic",
      "a courier service run by suspiciously fast tortoises",
      "a gym you can only enter while it's raining",
      "smart mirrors that hype you up before meetings",
      "a museum for expired coupons and dead batteries",
      "a meal kit for people who only eat the crispy bits",
    ],
  },
];

/** A rotating set of playful pre-selects surfaced at the bottom of /start. */
export const WILDCARD_TOPICS: string[] =
  TOPIC_CATALOG.find((c) => c.category === "Just for Fun")?.ideas ?? [];

/**
 * Recommended topics per focus button on /start step 2. Each of the five
 * independent focuses surfaces a different, curated set of topic ideas.
 */
export const FOCUS_IDEAS: Record<string, { blurb: string; ideas: string[] }> = {
  invent: {
    blurb: "Brand-new, inventive ideas",
    ideas: [
      "a gadget that keeps earbuds from tangling",
      "reusable packaging that dissolves after use",
      "an app that turns doodles into logos",
      "a smart water bottle that coaches hydration",
      "modular furniture that grows with your kids",
      "a device that finds lost TV remotes",
    ],
  },
  organize: {
    blurb: "Structure, tidy and streamline",
    ideas: [
      "a home-organization and decluttering service",
      "an app that plans your week around your energy",
      "a subscription for labeled meal-prep containers",
      "a digital filing system for small businesses",
      "a moving concierge that packs and unpacks",
      "a closet and capsule-wardrobe service",
    ],
  },
  plan: {
    blurb: "Map it out and plan ahead",
    ideas: [
      "an event-planning marketplace for micro-weddings",
      "a trip-planner for spontaneous weekends",
      "a coaching service for first-time founders",
      "a meal-planning app for busy families",
      "a retirement-planning tool for freelancers",
      "a project-plan template shop for creators",
    ],
  },
  implement: {
    blurb: "Build, make and ship it",
    ideas: [
      "a print-on-demand studio for indie designers",
      "a rapid-prototyping shop for hardware startups",
      "a no-code app-building service for local shops",
      "a custom-furniture maker with 3D previews",
      "a landing-page builder for weekend projects",
      "a small-batch manufacturing broker",
    ],
  },
  fund: {
    blurb: "Raise money and manage budgets",
    ideas: [
      "a crowdfunding coach for first-time creators",
      "a micro-investing app for spare change",
      "a grant-finder tool for small nonprofits",
      "an invoice-financing service for freelancers",
      "a budgeting app for irregular incomes",
      "a marketplace matching startups with angels",
    ],
  },
};
