import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Globale Einstellungen (PLAN 2.7): gelten geräteweit, nicht pro Save-Slot,
 * darum ein eigener Store mit eigenem localStorage-Key statt im versionierten
 * Spielstand. Sprache ist DE-only in v1, aber über i18n-Keys EN-ready.
 */
interface SettingsState {
  /** UI-Sounds an/aus. */
  sound: boolean;
  /** Reduzierte Animationen (Barrierefreiheit). */
  reducedMotion: boolean;
  setSound: (sound: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
}

/** Voreinstellung der reduzierten Animationen aus der OS-Präferenz ableiten. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      reducedMotion: prefersReducedMotion(),
      setSound: (sound) => set({ sound }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: "kobelgarten-settings" },
  ),
);
