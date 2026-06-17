import { createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Save } from "./migrations";

/**
 * Drei Save-Slots (PLAN 2.7) ohne Cloud: jeder Slot ist ein eigener
 * localStorage-Key, der laufende Spielstand persistiert über eine eigene
 * Storage-Implementierung immer in den gerade aktiven Slot. So bleibt die
 * persist-Middleware unangetastet und Slot-Wechsel ist nur ein anderer Key.
 */
export const SLOT_COUNT = 3;

const ACTIVE_SLOT_KEY = "kobelgarten-active-slot";
const LEGACY_SAVE_KEY = "kobelgarten-save";

function slotKey(slot: number): string {
  return `kobelgarten-save-${slot}`;
}

/**
 * localStorage, aber abgesichert: in Umgebungen ohne window (Tests, SSR)
 * fällt es auf eine In-Memory-Map zurück, damit das Importieren des Stores
 * nie crasht.
 */
const memory = new Map<string, string>();
const backing: Pick<Storage, "getItem" | "setItem" | "removeItem"> =
  typeof localStorage !== "undefined"
    ? localStorage
    : {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => void memory.set(key, value),
        removeItem: (key) => void memory.delete(key),
      };

/**
 * Einmalige Übernahme des alten Einzel-Saves (Pre-M6) in Slot 0, damit
 * Bestandsspieler ihren Garten behalten (Save-Bruch-Regel).
 */
function migrateLegacySave(): void {
  if (backing.getItem(slotKey(0)) != null) return;
  const legacy = backing.getItem(LEGACY_SAVE_KEY);
  if (legacy == null) return;
  backing.setItem(slotKey(0), legacy);
  backing.removeItem(LEGACY_SAVE_KEY);
}
migrateLegacySave();

export function getActiveSlot(): number {
  const raw = backing.getItem(ACTIVE_SLOT_KEY);
  const slot = raw == null ? 0 : Number(raw);
  return Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT ? slot : 0;
}

export function setActiveSlot(slot: number): void {
  if (slot < 0 || slot >= SLOT_COUNT) return;
  backing.setItem(ACTIVE_SLOT_KEY, String(slot));
}

/**
 * Storage für die persist-Middleware: leitet jeden Lese-/Schreibzugriff auf
 * den Key des aktuell aktiven Slots um (der Name aus den persist-Optionen
 * wird absichtlich ignoriert).
 */
const slotStateStorage: StateStorage = {
  getItem: () => backing.getItem(slotKey(getActiveSlot())),
  setItem: (_name, value) => backing.setItem(slotKey(getActiveSlot()), value),
  removeItem: () => backing.removeItem(slotKey(getActiveSlot())),
};

export const slotStorage = createJSONStorage<Save>(() => slotStateStorage);

/** Roher Slot-Inhalt (geparster persist-Blob), oder null wenn leer. */
export function readSlot(slot: number): Save | null {
  const raw = backing.getItem(slotKey(slot));
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: Save };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

/** Löscht den Slot vollständig (Spielstand verwerfen). */
export function clearSlot(slot: number): void {
  backing.removeItem(slotKey(slot));
}
