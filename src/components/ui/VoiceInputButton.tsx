"use client";

// The reusable bright-orange voice-record button. Drop it next to any text input
// or textarea and wire `onTranscript` to append dictated text to that field's
// state. Idle it is orange (bg-orange-500); while listening it pulses red with a
// Stop (Square) icon; when the browser lacks the Web Speech API it renders
// disabled with a helpful title. Styling matches the original inline button in
// ServicesPanel so every mic across the app looks identical.

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechToText } from "@/hooks/useSpeechToText";

type Size = "sm" | "md";

const SIZES: Record<Size, { box: string; mic: number; square: number }> = {
  sm: { box: "h-9 w-9", mic: 15, square: 14 },
  md: { box: "h-10 w-10", mic: 16, square: 15 },
};

export function VoiceInputButton({
  onTranscript,
  size = "md",
  className,
  title,
}: {
  /** Receives each finalised transcript — append it to your field's state. */
  onTranscript: (text: string) => void;
  /** Button size; defaults to the 40px "md" used in ServicesPanel. */
  size?: Size;
  /** Extra classes (e.g. margins) merged onto the button. */
  className?: string;
  /** Idle tooltip; defaults to a generic dictation hint. */
  title?: string;
}) {
  const { supported, listening, toggle } = useSpeechToText({ onTranscript });
  const s = SIZES[size];

  const hint = supported
    ? listening
      ? "Stop recording"
      : (title ?? "Tap to talk — dictate instead of typing")
    : "Voice input needs Chrome, Edge, or Safari";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-pressed={listening}
      aria-label={hint}
      title={hint}
      className={cn(
        "flex flex-none items-center justify-center rounded-xl text-white shadow-sm transition-colors disabled:opacity-40",
        s.box,
        listening
          ? "animate-pulse bg-red-500"
          : "bg-orange-500 hover:bg-orange-400",
        className,
      )}
    >
      {listening ? <Square size={s.square} /> : <Mic size={s.mic} />}
    </button>
  );
}
