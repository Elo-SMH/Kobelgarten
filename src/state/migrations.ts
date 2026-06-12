import { CONFIG } from "../content/config";
import type { PlantInstance } from "../engine/growth";
import type { LightPlacement } from "../engine/schemas";

/**
 * Versioned saves. Any change to the save shape requires bumping
 * SAVE_VERSION and adding a migration step below — never break old saves.
 */
export const SAVE_VERSION = 2;

export interface SaveV1 {
  tick: number;
  lastTickAt: number;
  hazelnuts: number;
}

export interface ShelfSlotState {
  placement: LightPlacement;
  plantId: string | null;
}

export interface SaveV2 extends SaveV1 {
  plants: Record<string, PlantInstance>;
  shelf: ShelfSlotState[];
  /** Monoton steigender Zähler für eindeutige Pflanzen-IDs. */
  plantCounter: number;
}

/** The current save shape. */
export type Save = SaveV2;

export function createDefaultShelf(): ShelfSlotState[] {
  return CONFIG.shelf.slots.map((placement) => ({ placement, plantId: null }));
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** Each entry migrates from version n-1 to n, keyed by n. */
const migrations: Record<number, Migration> = {
  // v1 → v2: Regal mit 4 Slots und Pflanzen-Sammlung (M2)
  2: (state) => ({
    ...state,
    plants: {},
    shelf: createDefaultShelf(),
    plantCounter: 0,
  }),
};

export function migrateSave(persisted: unknown, fromVersion: number): Save {
  let state = persisted as Record<string, unknown>;
  for (let version = fromVersion + 1; version <= SAVE_VERSION; version++) {
    const step = migrations[version];
    if (!step) {
      throw new Error(
        `Keine Save-Migration auf Version ${version} registriert`,
      );
    }
    state = step(state);
  }
  return state as unknown as Save;
}
