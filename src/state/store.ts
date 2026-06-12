import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONFIG } from "../content/config";
import { speciesById } from "../content/plants";
import { createSeedGenome } from "../engine/genetics";
import {
  createPlant,
  tickPlantMany,
  waterPlant as applyWatering,
} from "../engine/growth";
import { createRng, hashSeed } from "../engine/rng";
import { advanceTicks } from "../engine/ticks";
import {
  createDefaultShelf,
  migrateSave,
  SAVE_VERSION,
  type Save,
} from "./migrations";

interface GameStore extends Save {
  /**
   * Simulate all ticks that are due as of `now` (offline catch-up included,
   * capped per CONFIG). The UI passes the wall clock in; the engine stays
   * deterministic.
   */
  catchUp: (now: number) => void;
  /** M2-Platzhalter: kostenlos einpflanzen — der Shop kommt mit M3. */
  plantSeed: (slotIndex: number, speciesId: string) => void;
  waterPlant: (plantId: string) => void;
  /** Entsorgt eine eingegangene Pflanze (Verkauf lebender Pflanzen: M3). */
  removePlant: (plantId: string) => void;
}

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], Save>(
    (set, get) => ({
      tick: 0,
      lastTickAt: Date.now(),
      hazelnuts: CONFIG.startHazelnuts,
      plants: {},
      shelf: createDefaultShelf(),
      plantCounter: 0,

      catchUp: (now) => {
        const { tick, lastTickAt, plants, shelf } = get();
        const result = advanceTicks({ tick, lastTickAt }, now, CONFIG);
        if (result.state.lastTickAt === lastTickAt) return;
        if (result.applied === 0) {
          set({ tick: result.state.tick, lastTickAt: result.state.lastTickAt });
          return;
        }
        const grown = { ...plants };
        for (const slot of shelf) {
          if (!slot.plantId) continue;
          const plant = grown[slot.plantId];
          if (!plant) continue;
          const species = speciesById[plant.genome.speciesId];
          if (!species) continue;
          grown[slot.plantId] = tickPlantMany(
            plant,
            species,
            slot.placement,
            result.applied,
            CONFIG.growth,
          );
        }
        set({
          tick: result.state.tick,
          lastTickAt: result.state.lastTickAt,
          plants: grown,
        });
      },

      plantSeed: (slotIndex, speciesId) => {
        const { shelf, plants, plantCounter } = get();
        const slot = shelf[slotIndex];
        const species = speciesById[speciesId];
        if (!slot || slot.plantId !== null || !species) return;
        const nextCounter = plantCounter + 1;
        const id = `plant-${nextCounter}`;
        const rng = createRng(hashSeed(`${id}:${speciesId}`));
        const genome = createSeedGenome(species.id, rng, CONFIG.genetics);
        set({
          plants: { ...plants, [id]: createPlant(id, genome) },
          shelf: shelf.map((entry, index) =>
            index === slotIndex ? { ...entry, plantId: id } : entry,
          ),
          plantCounter: nextCounter,
        });
      },

      waterPlant: (plantId) => {
        const { plants } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead) return;
        set({ plants: { ...plants, [plantId]: applyWatering(plant) } });
      },

      removePlant: (plantId) => {
        const { plants, shelf } = get();
        const plant = plants[plantId];
        if (!plant || !plant.dead) return;
        const remaining = { ...plants };
        delete remaining[plantId];
        set({
          plants: remaining,
          shelf: shelf.map((entry) =>
            entry.plantId === plantId ? { ...entry, plantId: null } : entry,
          ),
        });
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
        plants: state.plants,
        shelf: state.shelf,
        plantCounter: state.plantCounter,
      }),
    },
  ),
);
