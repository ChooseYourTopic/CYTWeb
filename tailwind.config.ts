import type { Config } from "tailwindcss";

// All palette values are CSS-var tokens defined in src/app/globals.css.
// Swap the palette in ONE place (:root there) to re-skin the whole app.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        line: "var(--line)",
        ink: "var(--ink)",
        mut: "var(--mut)",
        dim: "var(--dim)",
        brand: "var(--brand)",
        brand2: "var(--brand2)",
        good: "var(--good)",
        warn: "var(--warn)",
        bad: "var(--bad)",
      },
      borderRadius: {
        card: "var(--r)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        pulse2: {
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        rise: "rise 0.5s forwards",
        pulse2: "pulse2 1.2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
