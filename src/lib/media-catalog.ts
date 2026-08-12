// Media Creator catalog — the indexed set of media PROJECT TYPES the topic dashboard's
// Media tab recommends. Synthesized (analyst report: Lead Interlink vs ElevenLabs vs
// GoHighLevel) into ChooseYourTopic's OWN catalog; the competitors are reference-only
// lineage (see .claude/knowledge/media-creator-catalog.md). The panel reads this file;
// the backend generation pipeline will read the same keys later.

export type MediaKind = "image" | "video" | "audio" | "social" | "ad" | "text" | "other";
export type MediaBucket =
  | "images"
  | "clips"
  | "social"
  | "ads"
  | "audio"
  | "music"
  | "long_form"
  | "more";

export interface MediaProject {
  key: string;
  label: string;
  kind: MediaKind;
  bucket: MediaBucket;
  description: string;
  outputs: string[];
}

// Display order + labels for the browse-by-bucket sections.
export const MEDIA_BUCKETS: { key: MediaBucket; label: string }[] = [
  { key: "images", label: "Images" },
  { key: "clips", label: "Clips" },
  { key: "social", label: "Social posts" },
  { key: "ads", label: "Ad creatives" },
  { key: "audio", label: "Voiceover & audio" },
  { key: "music", label: "Music & sound" },
  { key: "long_form", label: "Long-form & docs" },
  { key: "more", label: "…and more" },
];

export const MEDIA_CATALOG: MediaProject[] = [
  { key: "brand-image", label: "Brand Image / Hero", kind: "image", bucket: "images", description: "Render-ready hero or feature image on-brand for the topic.", outputs: ["1–4 images", "prompt spec", "per-aspect"] },
  { key: "product-shot", label: "Product / Mockup Shot", kind: "image", bucket: "images", description: "Staged product, device, or packaging mockup.", outputs: ["1–4 images", "transparent + framed"] },
  { key: "infographic", label: "Infographic / Data Visual", kind: "image", bucket: "images", description: "Explainer graphic turning a fact/stat set into a visual.", outputs: ["infographic image", "caption"] },
  { key: "quote-card", label: "Quote / Stat Card", kind: "image", bucket: "images", description: "Shareable branded quote or stat card.", outputs: ["square image", "story image"] },
  { key: "image-variation-set", label: "Image Variation Set", kind: "image", bucket: "images", description: "Multiple on-brand options of one concept to pick from.", outputs: ["4-up option grid"] },
  { key: "short-video-ladder", label: "Short Video (5-length ladder)", kind: "video", bucket: "clips", description: "Core short video at 15/30/45/60/90s, per aspect.", outputs: ["MP4 ladder × aspect", "script"] },
  { key: "explainer-video", label: "Explainer / How-It-Works Clip", kind: "video", bucket: "clips", description: "Narrated explainer of the topic's product or idea.", outputs: ["video", "voiceover", "captions"] },
  { key: "talking-head-avatar", label: "Talking-Head / Avatar Clip", kind: "video", bucket: "clips", description: "Presenter-style clip from a script plus synthetic voice.", outputs: ["video", "voiceover track"] },
  { key: "product-demo-video", label: "Product Demo Clip", kind: "video", bucket: "clips", description: "Feature walkthrough or demo reel.", outputs: ["video", "voiceover", "captions"] },
  { key: "dubbed-video", label: "Dubbed / Localized Video", kind: "video", bucket: "clips", description: "Existing clip re-voiced into another language.", outputs: ["localized MP4", "subtitle file"] },
  { key: "captioned-social-cut", label: "Captioned Social Cut", kind: "video", bucket: "clips", description: "Vertical, burned-in-caption cut for reels / shorts / TikTok.", outputs: ["9:16 MP4", "SRT"] },
  { key: "social-post-single", label: "Single Social Post", kind: "social", bucket: "social", description: "One on-brand post (caption plus visual) for a chosen platform.", outputs: ["caption", "hashtags", "image"] },
  { key: "social-carousel", label: "Carousel / Multi-slide Post", kind: "social", bucket: "social", description: "Multi-slide swipe post — educational or story.", outputs: ["5–10 slide images", "captions"] },
  { key: "hook-pack", label: "Hook / Caption Pack", kind: "text", bucket: "social", description: "Batch of scroll-stopping hooks and captions to reuse.", outputs: ["10–20 hooks", "variants"] },
  { key: "content-calendar", label: "Social Content Calendar", kind: "social", bucket: "social", description: "Planned multi-post calendar with suggested post times.", outputs: ["scheduled post plan", "timing"] },
  { key: "thread-script", label: "Thread / Short-form Script", kind: "text", bucket: "social", description: "Multi-post thread or short-video script outline.", outputs: ["threaded copy", "beat sheet"] },
  { key: "ad-copy-set", label: "Per-Platform Ad Copy Set", kind: "ad", bucket: "ads", description: "Headline plus primary text plus CTA variants per platform.", outputs: ["A/B copy set", "per platform"] },
  { key: "ad-creative-image", label: "Ad Creative (image)", kind: "ad", bucket: "ads", description: "Conversion-focused static ad image plus overlay copy.", outputs: ["ad image set", "copy"] },
  { key: "video-ad-script", label: "Video Ad Script + Cut", kind: "ad", bucket: "ads", description: "Hook → problem → solution → CTA ad script, optional cut.", outputs: ["script", "optional MP4"] },
  { key: "lead-magnet", label: "Lead Magnet / Offer Asset", kind: "ad", bucket: "ads", description: "Gated asset (checklist or guide) to capture leads.", outputs: ["PDF / asset", "landing copy"] },
  { key: "brand-voiceover", label: "Brand Voiceover / Narration", kind: "audio", bucket: "audio", description: "Narration in the topic's brand voice from a script.", outputs: ["audio track (MP3/WAV)"] },
  { key: "brand-voice-design", label: "Brand Voice Design", kind: "audio", bucket: "audio", description: "Define or clone a reusable persona voice for the topic.", outputs: ["saved voice profile"] },
  { key: "podcast-episode", label: "Podcast / Audio Episode", kind: "audio", bucket: "audio", description: "Long-form spoken episode from an outline or script.", outputs: ["audio episode", "show notes"] },
  { key: "audiogram", label: "Audiogram / Audio Snippet", kind: "audio", bucket: "audio", description: "Short audio clip with a waveform visual for social.", outputs: ["9:16 / 1:1 video-wrapped audio"] },
  { key: "background-music", label: "Background Music Track", kind: "audio", bucket: "music", description: "Generative on-brand music bed for clips and ads.", outputs: ["music track (loopable)"] },
  { key: "jingle-sonic-logo", label: "Jingle / Sonic Logo", kind: "audio", bucket: "music", description: "Short branded audio signature or jingle.", outputs: ["short audio stinger"] },
  { key: "sound-design-pack", label: "Sound Effects / SFX Pack", kind: "audio", bucket: "music", description: "Custom SFX or ambient set for video and audio projects.", outputs: ["SFX asset pack"] },
  { key: "article-blog", label: "Article / Blog Post", kind: "text", bucket: "long_form", description: "SEO-aware article or blog post on the topic.", outputs: ["article (MD/HTML)", "meta"] },
  { key: "newsletter-email", label: "Newsletter / Email Sequence", kind: "text", bucket: "long_form", description: "Email or multi-step email sequence, multi-tone.", outputs: ["emails", "subject lines"] },
  { key: "how-to-guide", label: "How-To Guide / Ebook", kind: "text", bucket: "long_form", description: "Structured guide or short ebook / lead-magnet doc.", outputs: ["multi-section doc / PDF"] },
  { key: "press-release", label: "Press Release / News Item", kind: "text", bucket: "long_form", description: "Announcement or news-style write-up for the topic.", outputs: ["press release copy"] },
  { key: "investor-update", label: "Investor / Stakeholder Update", kind: "text", bucket: "long_form", description: "Progress or metrics update for stakeholders.", outputs: ["structured update doc"] },
  { key: "agent-prompt-pack", label: "Agent Prompt Pack", kind: "other", bucket: "more", description: "Ready-to-run prompts for the user's own agents.", outputs: ["prompt bundle (JSON/MD)"] },
  { key: "lead-list", label: "AI Lead List", kind: "other", bucket: "more", description: "Targeted prospect or lead list for the topic's audience.", outputs: ["lead list (CSV)"] },
  { key: "landing-page-copy", label: "Landing / Funnel Page Copy", kind: "text", bucket: "more", description: "Conversion copy for a landing or funnel page.", outputs: ["sectioned page copy"] },
  { key: "review-response", label: "Review / Reputation Content", kind: "text", bucket: "more", description: "Review requests plus on-brand review responses.", outputs: ["request templates", "response templates"] },
  { key: "custom-brief", label: "Custom / Other Project", kind: "other", bucket: "more", description: "Freeform brief for anything not covered above.", outputs: ["brief", "best-fit output"] },
];

export const MEDIA_BY_KEY: Record<string, MediaProject> = Object.fromEntries(
  MEDIA_CATALOG.map((p) => [p.key, p]),
);

// Keyword → project keys (from the analyst heuristic). Each rule's `tokens` are OR-matched
// as substrings against the lowercased idea; matches union (first-seen order preserved).
const RECOMMEND_RULES: { tokens: string[]; keys: string[] }[] = [
  { tokens: ["logo", "hero", "banner", "picture", "image", "graphic", "visual"], keys: ["brand-image", "image-variation-set", "product-shot"] },
  { tokens: ["product", "mockup", "packaging", "device"], keys: ["product-shot", "ad-creative-image"] },
  { tokens: ["stat", "data", "chart", "infographic", "the numbers"], keys: ["infographic", "quote-card"] },
  { tokens: ["quote", "testimonial"], keys: ["quote-card", "review-response"] },
  { tokens: ["video", "clip", "reel", "short", "tiktok", "youtube", "film"], keys: ["short-video-ladder", "captioned-social-cut", "explainer-video"] },
  { tokens: ["explain", "how it works", "walkthrough", "tutorial"], keys: ["explainer-video", "how-to-guide", "product-demo-video"] },
  { tokens: ["demo", "feature"], keys: ["product-demo-video", "explainer-video"] },
  { tokens: ["presenter", "spokesperson", "avatar", "talking head", "face"], keys: ["talking-head-avatar"] },
  { tokens: ["translate", "dub", "language", "localize", "spanish", "french"], keys: ["dubbed-video", "brand-voice-design"] },
  { tokens: ["post", "instagram", "facebook", "linkedin", "social", "caption"], keys: ["social-post-single", "social-carousel", "hook-pack"] },
  { tokens: ["carousel", "slides", "swipe"], keys: ["social-carousel"] },
  { tokens: ["hook", "headline ideas"], keys: ["hook-pack", "thread-script"] },
  { tokens: ["calendar", "schedule", "content plan", "weekly posts"], keys: ["content-calendar"] },
  { tokens: ["thread", "tweet", "x post", "short script"], keys: ["thread-script"] },
  { tokens: ["ad", "advertis", "campaign", "promo", "conversion"], keys: ["ad-copy-set", "ad-creative-image", "video-ad-script"] },
  { tokens: ["lead magnet", "freebie", "checklist", "gated", "opt-in"], keys: ["lead-magnet", "how-to-guide"] },
  { tokens: ["voiceover", "narration", "voice over", "narrate", "read aloud"], keys: ["brand-voiceover", "podcast-episode"] },
  { tokens: ["clone", "brand voice", "persona voice"], keys: ["brand-voice-design", "brand-voiceover"] },
  { tokens: ["podcast", "episode", "audio show", "interview"], keys: ["podcast-episode", "audiogram"] },
  { tokens: ["audiogram", "audio snippet", "waveform"], keys: ["audiogram"] },
  { tokens: ["music", "track", "beat", "soundtrack", "bed"], keys: ["background-music", "jingle-sonic-logo"] },
  { tokens: ["jingle", "sonic logo", "sound signature"], keys: ["jingle-sonic-logo"] },
  { tokens: ["sound effect", "sfx", "ambient", "foley"], keys: ["sound-design-pack"] },
  { tokens: ["article", "blog", "seo", "write up", "post about"], keys: ["article-blog"] },
  { tokens: ["email", "newsletter", "sequence", "drip", "broadcast"], keys: ["newsletter-email"] },
  { tokens: ["guide", "ebook", "how-to", "manual", "book"], keys: ["how-to-guide"] },
  { tokens: ["press", "announcement", "news", "pr"], keys: ["press-release"] },
  { tokens: ["investor", "update", "stakeholder", "report"], keys: ["investor-update"] },
  { tokens: ["prompt", "agent", "automation"], keys: ["agent-prompt-pack"] },
  { tokens: ["lead list", "prospects", "leads", "contacts", "audience list"], keys: ["lead-list"] },
  { tokens: ["landing", "funnel", "page copy", "sales page", "website copy"], keys: ["landing-page-copy"] },
  { tokens: ["review", "reputation", "rating", "feedback response"], keys: ["review-response"] },
];

const DEFAULT_KEYS = ["short-video-ladder", "brand-image", "social-post-single", "ad-copy-set", "brand-voiceover", "custom-brief"];
const FALLBACK_KEY = "custom-brief";

/**
 * Given a free-text/voice idea, return the recommended project keys (ordered, de-duped,
 * capped). No match → the default starter set. `custom-brief` is always appended last.
 */
export function recommendProjects(idea: string, cap = 6): MediaProject[] {
  const text = idea.trim().toLowerCase();
  const keys: string[] = [];
  const push = (k: string) => {
    if (!keys.includes(k) && MEDIA_BY_KEY[k]) keys.push(k);
  };

  if (text) {
    for (const rule of RECOMMEND_RULES) {
      if (rule.tokens.some((t) => text.includes(t))) rule.keys.forEach(push);
    }
  }

  const base = keys.length ? keys : text ? [FALLBACK_KEY] : DEFAULT_KEYS;
  const capped = base.slice(0, cap);
  if (!capped.includes(FALLBACK_KEY)) capped.push(FALLBACK_KEY);

  return capped.map((k) => MEDIA_BY_KEY[k]).filter(Boolean);
}
