import { create } from "zustand";
import type { SectionKey } from "@/lib/api";

type NewCounts = Partial<Record<SectionKey, number>>;

type ResearchState = {
  activeSection: SectionKey;
  wsConnected: boolean;
  // Per-section "new results" counters, buffered so we never scroll-jack.
  newCounts: NewCounts;
  // Highest activity event id we've observed (for reconnect backfill).
  lastSeq: number;

  setActiveSection: (s: SectionKey) => void;
  setWsConnected: (c: boolean) => void;
  bumpSection: (s: SectionKey, n?: number) => void;
  markSectionRead: (s: SectionKey) => void;
  setLastSeq: (n: number) => void;
};

export const useResearchStore = create<ResearchState>((set) => ({
  activeSection: "overview",
  wsConnected: false,
  newCounts: {},
  lastSeq: 0,

  setActiveSection: (s) =>
    set((state) => ({
      activeSection: s,
      newCounts: { ...state.newCounts, [s]: 0 },
    })),

  setWsConnected: (c) => set({ wsConnected: c }),

  bumpSection: (s, n = 1) =>
    set((state) => {
      // Don't badge the section the user is currently reading.
      if (state.activeSection === s) return state;
      return {
        newCounts: { ...state.newCounts, [s]: (state.newCounts[s] ?? 0) + n },
      };
    }),

  markSectionRead: (s) =>
    set((state) => ({ newCounts: { ...state.newCounts, [s]: 0 } })),

  setLastSeq: (n) =>
    set((state) => ({ lastSeq: Math.max(state.lastSeq, n) })),
}));
