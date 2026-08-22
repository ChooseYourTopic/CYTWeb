"use client";

import { useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Film,
  Music,
  Megaphone,
  Share2,
  FileText,
  Wand2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import {
  MEDIA_CATALOG,
  MEDIA_BUCKETS,
  recommendProjects,
  type MediaKind,
  type MediaProject,
} from "@/lib/media-catalog";

/**
 * Media — the topic's content creator. The user records their voice or types an idea, and
 * the panel recommends media PROJECTS to generate (images, clips, social posts, ad creatives,
 * voiceover/audio, music, long-form, and more), then lets them browse the full catalog by
 * bucket. Modeled on Lead Interlink's Content Studio (capture → recommend → generate). This
 * pass is the creator INTERFACE for feedback; generation wires to the topic's agent engine next.
 */

const KIND_ICON: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  social: Share2,
  ad: Megaphone,
  text: FileText,
  other: Wand2,
};

const KIND_LABEL: Record<MediaKind, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  social: "Social",
  ad: "Ad",
  text: "Copy",
  other: "Project",
};

function ProjectCard({
  p,
  recommended,
  active,
  onPick,
}: {
  p: MediaProject;
  recommended?: boolean;
  active?: boolean;
  onPick: (key: string) => void;
}) {
  const Icon = KIND_ICON[p.kind];
  return (
    <button
      onClick={() => onPick(p.key)}
      className={cn(
        "group flex flex-col items-start gap-1.5 rounded-2xl border bg-panel p-3.5 text-left transition-colors hover:border-brand/50",
        active ? "border-brand" : recommended ? "border-brand/40" : "border-line",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel2 text-mut group-hover:text-brand">
          <Icon size={15} />
        </span>
        {recommended && (
          <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
            Recommended
          </span>
        )}
      </div>
      <span className="text-[13px] font-semibold text-ink">{p.label}</span>
      <span className="line-clamp-2 text-[12px] leading-snug text-mut">{p.description}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
        Start project <ArrowRight size={12} />
      </span>
    </button>
  );
}

export function MediaPanel() {
  const [idea, setIdea] = useState("");
  const [picked, setPicked] = useState<MediaProject | null>(null);

  const recommended = useMemo(
    () => (idea.trim() ? recommendProjects(idea) : []),
    [idea],
  );

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Media</h3>
        <p className="text-[13px] text-mut">
          Talk or type an idea and your agents turn it into media — images, clips, social posts,
          ad creatives, voiceover, music, and more.
        </p>
      </div>

      {/* Capture: voice-record or type an idea (the creator front door). */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-ink">Start a media project</span>
          {picked && (
            <span className="text-[11.5px] text-dim">Selected: {picked.label}</span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder="e.g. A 30-second launch video and three Instagram posts for our new cold brew…"
            className="min-h-[72px] w-full resize-y rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:outline-none"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setIdea((prev) => (prev ? `${prev} ${text}` : text))
            }
            title="Dictate your idea"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] text-dim">
            Tap the orange mic to talk it through, or type. We recommend the best
            projects for your idea.
          </p>
          {idea && (
            <button
              type="button"
              onClick={() => setIdea("")}
              className="text-[11px] text-dim hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Cosmetic selection acknowledgement — generation wires to the agent engine next. */}
      {picked && (
        <div className="flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/10 p-3 text-[12.5px] text-brand">
          <Wand2 size={15} className="mt-0.5 flex-none" />
          <span>
            <b>{picked.label}</b> is queued in the creator. Generating it through your topic&apos;s
            agents is being wired up — for now this is the creator interface, live for your feedback.
          </span>
        </div>
      )}

      {/* Recommended projects for the typed/spoken idea. */}
      {recommended.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] uppercase tracking-wider text-dim">
            <Wand2 size={12} /> Recommended for your idea
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((p) => (
              <ProjectCard
                key={p.key}
                p={p}
                recommended
                active={picked?.key === p.key}
                onPick={() => setPicked(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Browse the full catalog by bucket. */}
      <div className="space-y-4">
        <div className="text-[12px] uppercase tracking-wider text-dim">Browse the media library</div>
        {MEDIA_BUCKETS.map((bucket) => {
          const items = MEDIA_CATALOG.filter((p) => p.bucket === bucket.key);
          if (items.length === 0) return null;
          return (
            <div key={bucket.key}>
              <div className="mb-2 text-[12.5px] font-semibold text-ink">{bucket.label}</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <ProjectCard
                    key={p.key}
                    p={p}
                    active={picked?.key === p.key}
                    onPick={() => setPicked(p)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
