import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONFIG } from "../content/config";
import { advanceTicks } from "../engine/ticks";
import { migrateSave, SAVE_VERSION, type Save } from "./migrations";

interface GameStore extends Save {
  /**
   * Simulate all ticks that are due as of `now` (offline catch-up included,
   * capped per CONFIG). The UI passes the wall clock in; the engine stays
   * deterministic.
   */
  catchUp: (now: number) => void;
}

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], Save>(
    (set, get) => ({
      tick: 0,
      lastTickAt: Date.now(),
      hazelnuts: CONFIG.startHazelnuts,

      catchUp: (now) => {
        const { tick, lastTickAt } = get();
        const result = advanceTicks({ tick, lastTickAt }, now, CONFIG);
        if (result.state.lastTickAt !== lastTickAt) {
          set({
            tick: result.state.tick,
            lastTickAt: result.state.lastTickAt,
          });
        }
      },
    }),
    {
      name: "kobelgarten-save",
      version: SAVE_VERSION,
      migrate: migrateSave,
      partialize: (state) => ({
        tick: state.tick,
        lastTickAt: state.lastTickAt,
        hazelnuts: state.hazelnuts,
      }),
    },
  ),
);
