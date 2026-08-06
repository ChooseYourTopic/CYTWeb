"use client";

import { Image as ImageIcon, Film, Megaphone, Sparkles } from "lucide-react";

/**
 * Media — where the topic's generated creative output will live: images, video
 * clips, social posts, and ad creatives the agents produce. Placeholder/scaffold
 * for now (content TBD); no backend wired yet — a clean seam for the media
 * pipeline. Matches the styling tokens of the other research panels.
 */
export function MediaPanel() {
  const kinds = [
    { icon: ImageIcon, label: "Images" },
    { icon: Film, label: "Video clips" },
    { icon: Sparkles, label: "Social posts" },
    { icon: Megaphone, label: "Ad creatives" },
  ];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Media</h3>
        <p className="text-[13px] text-mut">
          Where your topic&apos;s generated media lives — images, video clips,
          social posts, and ad creatives your agents produce.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kinds.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel p-4 text-center"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel2 text-mut">
              <Icon size={16} />
            </span>
            <span className="text-[12.5px] text-mut">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-panel2 text-dim">
          <ImageIcon size={20} />
        </span>
        <p className="text-[14px] font-semibold text-ink">No media yet</p>
        <p className="max-w-[360px] text-[13px] text-mut">
          Your agents&apos; creative output will show up here.
        </p>
      </div>
    </div>
  );
}
