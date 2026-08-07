import type { ChallengeDifficulty } from "@/lib/api";

/**
 * A treasure-chest game piece for the Challenges board. Rarity (difficulty) drives
 * the metal tone; `open` raises the lid, lights the interior glow, and shows loot —
 * the completed state. Pure SVG so it scales crisply at any size.
 */

/** Difficulty → the chest's metal tone (steel → brand → bronze → gold). */
const TONE: Record<ChallengeDifficulty, string> = {
  trivial: "#9aa4b2",
  standard: "#6ea8ff",
  hard: "#c98a3a",
  boss: "#f0c245",
};

export function chestTone(difficulty?: string): string {
  return TONE[(difficulty as ChallengeDifficulty) ?? "standard"] ?? TONE.standard;
}

export function ChestIcon({
  open = false,
  difficulty,
  size = 48,
}: {
  open?: boolean;
  difficulty?: string;
  size?: number;
}) {
  const tone = chestTone(difficulty);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      {/* interior glow + loot when opened */}
      {open && (
        <>
          <ellipse cx="24" cy="24" rx="15" ry="9" fill={tone} opacity="0.28" />
          <path
            d="M24 12 l1.5 3.2 3.5.5-2.6 2.4.7 3.5-3.1-1.7-3.1 1.7.7-3.5-2.6-2.4 3.5-.5z"
            fill={tone}
          />
        </>
      )}

      {/* chest body */}
      <rect
        x="8"
        y="24"
        width="32"
        height="15"
        rx="2.5"
        fill="#6b4f2a"
        stroke="#39280f"
        strokeWidth="1.6"
      />
      {/* vertical + base bands */}
      <rect x="21.5" y="24" width="5" height="15" fill={tone} opacity="0.9" />
      <rect x="8" y="35.5" width="32" height="3" rx="1" fill={tone} opacity="0.85" />

      {/* lid — domed; raised + tilted when open */}
      <g
        transform={open ? "translate(-0.5 -7) rotate(-16 9 22)" : ""}
        style={{ transition: "transform 180ms ease" }}
      >
        <path
          d="M8 24 v-2 Q8 12.5 24 12.5 Q40 12.5 40 22 v2 Z"
          fill="#7d5c31"
          stroke="#39280f"
          strokeWidth="1.6"
        />
        <rect x="8" y="22.5" width="32" height="2.4" rx="1" fill={tone} opacity="0.85" />
      </g>

      {/* lock plate (hidden while open) */}
      {!open && (
        <>
          <rect
            x="21"
            y="26.5"
            width="6"
            height="6.5"
            rx="1.2"
            fill={tone}
            stroke="#39280f"
            strokeWidth="0.8"
          />
          <circle cx="24" cy="29.5" r="1.1" fill="#39280f" />
        </>
      )}
    </svg>
  );
}
