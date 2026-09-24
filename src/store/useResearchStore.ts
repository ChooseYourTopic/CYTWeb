import { create } from "zustand";
import type { SectionKey, ViewMode } from "@/lib/api";

type NewCounts = Partial<Record<SectionKey, number>>;

type ResearchState = {
  activeSection: SectionKey;
  wsConnected: boolean;
  // Per-section "new results" counters, buffered so we never scroll-jack.
  newCounts: NewCounts;
  // Highest activity event id we've observed (for reconnect backfill).
  lastSeq: number;
  // Dashboard density: standard = core five tabs, advanced = every tab.
  viewMode: ViewMode;
  // #5 collaborator tab-hiding: when true (viewer is a collaborator on a topic
  // they don't own), the tab shell is restricted to `grantedSections` — the
  // module tabs their binding allows — instead of the viewMode density. Owner/
  // staff leave this false and keep the full viewMode-driven tab set.
  restrictSections: boolean;
  grantedSections: SectionKey[];

  setActiveSection: (s: SectionKey) => void;
  setWsConnected: (c: boolean) => void;
  bumpSection: (s: SectionKey, n?: number) => void;
  markSectionRead: (s: SectionKey) => void;
  setLastSeq: (n: number) => void;
  setViewMode: (m: ViewMode) => void;
  setSectionGrant: (restrict: boolean, granted: SectionKey[]) => void;
};

export const useResearchStore = create<ResearchState>((set) => ({
  activeSection: "overview",
  wsConnected: false,
  newCounts: {},
  lastSeq: 0,
  viewMode: "standard",
  restrictSections: false,
  grantedSections: [],

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

  setViewMode: (m) => set({ viewMode: m }),

  setSectionGrant: (restrict, granted) =>
    set({ restrictSections: restrict, grantedSections: granted }),
}));
