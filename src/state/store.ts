import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONFIG } from "../content/config";
import { potItemId, shopItemById } from "../content/items";
import { speciesById } from "../content/plants";
import { plantValue, shelfSlotPrice } from "../engine/economy";
import { createSeedGenome } from "../engine/genetics";
import {
  createPlant,
  fertilizePlant as applyFertilizer,
  tickPlantMany,
  waterPlant as applyWatering,
} from "../engine/growth";
import { createRng, hashSeed } from "../engine/rng";
import type { PotSize } from "../engine/schemas";
import { advanceTicks } from "../engine/ticks";
import {
  createDefaultShelf,
  migrateSave,
  SAVE_VERSION,
  type Save,
} from "./migrations";
import { itemPrice, todaysOffer } from "./shop";

interface GameStore extends Save {
  /**
   * Simulate all ticks that are due as of `now` (offline catch-up included,
   * capped per CONFIG). The UI passes the wall clock in; the engine stays
   * deterministic.
   */
  catchUp: (now: number) => void;
  /** Kauft ein Shop-Item zum aktuellen Preis (inkl. Tagesangebot). */
  buyItem: (itemId: string) => void;
  /** Kauft einen zusätzlichen Regal-Slot (Preis steigt pro Zukauf). */
  buyShelfSlot: () => void;
  /** Pflanzt einen Samen aus dem Inventar in einen Topf aus dem Inventar. */
  plantSeed: (slotIndex: number, speciesId: string, potSize: PotSize) => void;
  waterPlant: (plantId: string) => void;
  /** Gießkannen-Upgrade (Level 2): gießt alle lebenden Pflanzen. */
  waterAll: () => void;
  /** Verbraucht 1 Dünger aus dem Inventar für einen Wachstums-Buff. */
  fertilizePlant: (plantId: string) => void;
  /** Verkauft eine lebende Pflanze zum Live-Wert; der Topf kommt zurück. */
  sellPlant: (plantId: string) => void;
  /** Entsorgt eine eingegangene Pflanze; der Topf kommt zurück. */
  removePlant: (plantId: string) => void;
}

/** Inventar-Update; Einträge mit Bestand 0 werden entfernt. */
function withCount(
  inventory: Record<string, number>,
  itemId: string,
  delta: number,
): Record<string, number> {
  const next = { ...inventory };
  const count = (next[itemId] ?? 0) + delta;
  if (count <= 0) delete next[itemId];
  else next[itemId] = count;
  return next;
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
      inventory: {},
      wateringCanLevel: 1,

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

      buyItem: (itemId) => {
        const { hazelnuts, inventory, wateringCanLevel } = get();
        const item = shopItemById[itemId];
        if (!item) return;
        const price = itemPrice(itemId, todaysOffer(new Date()));
        if (hazelnuts < price) return;
        if (item.kind === "upgrade") {
          if (item.upgradeId === "wateringCan" && wateringCanLevel >= 2) return;
          set({ hazelnuts: hazelnuts - price, wateringCanLevel: 2 });
          return;
        }
        set({
          hazelnuts: hazelnuts - price,
          inventory: withCount(inventory, itemId, 1),
        });
      },

      buyShelfSlot: () => {
        const { hazelnuts, shelf } = get();
        if (shelf.length >= CONFIG.shop.maxShelfSlots) return;
        const extraSlots = shelf.length - CONFIG.shelf.slots.length;
        const price = shelfSlotPrice(extraSlots, CONFIG.shop.shelfSlot);
        if (hazelnuts < price) return;
        const cycle = CONFIG.shelf.extraSlotCycle;
        const placement = cycle[extraSlots % cycle.length];
        set({
          hazelnuts: hazelnuts - price,
          shelf: [...shelf, { placement, plantId: null }],
        });
      },

      plantSeed: (slotIndex, speciesId, potSize) => {
        const { shelf, plants, plantCounter, inventory } = get();
        const slot = shelf[slotIndex];
        const species = speciesById[speciesId];
        if (!slot || slot.plantId !== null || !species) return;
        const seedId = `seed-${speciesId}`;
        const potId = potItemId(potSize);
        if ((inventory[seedId] ?? 0) < 1 || (inventory[potId] ?? 0) < 1) return;
        const nextCounter = plantCounter + 1;
        const id = `plant-${nextCounter}`;
        const rng = createRng(hashSeed(`${id}:${speciesId}`));
        const genome = createSeedGenome(species.id, rng, CONFIG.genetics);
        set({
          plants: { ...plants, [id]: createPlant(id, genome, potSize) },
          shelf: shelf.map((entry, index) =>
            index === slotIndex ? { ...entry, plantId: id } : entry,
          ),
          plantCounter: nextCounter,
          inventory: withCount(withCount(inventory, seedId, -1), potId, -1),
        });
      },

      waterPlant: (plantId) => {
        const { plants } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead) return;
        set({ plants: { ...plants, [plantId]: applyWatering(plant) } });
      },

      waterAll: () => {
        const { plants, wateringCanLevel } = get();
        if (wateringCanLevel < 2) return;
        set({
          plants: Object.fromEntries(
            Object.entries(plants).map(([id, plant]) => [
              id,
              plant.dead ? plant : applyWatering(plant),
            ]),
          ),
        });
      },

      fertilizePlant: (plantId) => {
        const { plants, inventory } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead || plant.fertilizerTicks > 0) return;
        if ((inventory["duenger"] ?? 0) < 1) return;
        set({
          plants: {
            ...plants,
            [plantId]: applyFertilizer(plant, CONFIG.growth),
          },
          inventory: withCount(inventory, "duenger", -1),
        });
      },

      sellPlant: (plantId) => {
        const { plants, shelf, hazelnuts, inventory } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead) return;
        const species = speciesById[plant.genome.speciesId];
        if (!species) return;
        const value = plantValue(plant, species, CONFIG.growth, CONFIG.economy);
        const remaining = { ...plants };
        delete remaining[plantId];
        set({
          hazelnuts: hazelnuts + value,
          plants: remaining,
          shelf: shelf.map((entry) =>
            entry.plantId === plantId ? { ...entry, plantId: null } : entry,
          ),
          inventory: withCount(inventory, potItemId(plant.potSize), 1),
        });
      },

      removePlant: (plantId) => {
        const { plants, shelf, inventory } = get();
        const plant = plants[plantId];
        if (!plant || !plant.dead) return;
        const remaining = { ...plants };
        delete remaining[plantId];
        set({
          plants: remaining,
          shelf: shelf.map((entry) =>
            entry.plantId === plantId ? { ...entry, plantId: null } : entry,
          ),
          inventory: withCount(inventory, potItemId(plant.potSize), 1),
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
        inventory: state.inventory,
        wateringCanLevel: state.wateringCanLevel,
      }),
    },
  ),
);
