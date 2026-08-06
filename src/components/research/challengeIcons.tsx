import {
  Crosshair,
  Rocket,
  Eye,
  Swords,
  Crown,
  Flame,
  BarChart3,
  Lightbulb,
  Megaphone,
  Coins,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { ChallengeDifficulty } from "@/lib/api";

/** Challenge/reward icon token → a lucide component (see spec §4.3 icon set). */
const ICONS: Record<string, LucideIcon> = {
  crosshair: Crosshair,
  rocket: Rocket,
  eye: Eye,
  knife: Swords,
  crown: Crown,
  flame: Flame,
  chart: BarChart3,
  bulb: Lightbulb,
  megaphone: Megaphone,
  coin: Coins,
};

export function iconFor(token?: string): LucideIcon {
  return (token && ICONS[token]) || Target;
}

/** Difficulty → a frame color class set (trivial gray → boss gold). */
export const DIFFICULTY_FRAME: Record<
  ChallengeDifficulty,
  { border: string; text: string; chip: string; label: string }
> = {
  trivial: {
    border: "border-line",
    text: "text-mut",
    chip: "border-line bg-panel2 text-mut",
    label: "Trivial",
  },
  standard: {
    border: "border-brand/50",
    text: "text-brand",
    chip: "border-brand/50 bg-brand/10 text-brand",
    label: "Standard",
  },
  hard: {
    border: "border-[#4a3b1a]",
    text: "text-warn",
    chip: "border-[#4a3b1a] bg-[#1c1708] text-warn",
    label: "Hard",
  },
  boss: {
    border: "border-[#7a5c14]",
    text: "text-[#f0c245]",
    chip: "border-[#7a5c14] bg-[#221a06] text-[#f0c245]",
    label: "Boss",
  },
};

export function frameFor(difficulty?: string) {
  return (
    DIFFICULTY_FRAME[(difficulty as ChallengeDifficulty) ?? "standard"] ??
    DIFFICULTY_FRAME.standard
  );
}
