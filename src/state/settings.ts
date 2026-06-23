import { create } from "zustand";
import { persist } from "zustand/middleware";
import { detectLocale, type Locale } from "../i18n/locale";

/**
 * Globale Einstellungen (PLAN 2.7): gelten geräteweit, nicht pro Save-Slot,
 * darum ein eigener Store mit eigenem localStorage-Key statt im versionierten
 * Spielstand. Die Sprache wird ohne gespeicherte Wahl aus der Browser-/
 * Systemsprache abgeleitet und lässt sich im Menü umstellen.
 */
interface SettingsState {
  /** UI-Sounds an/aus. */
  sound: boolean;
  /** Reduzierte Animationen (Barrierefreiheit). */
  reducedMotion: boolean;
  /** UI-Sprache. Default: Browser-/Systemsprache, sonst Deutsch. */
  language: Locale;
  setSound: (sound: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setLanguage: (language: Locale) => void;
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
      language: detectLocale(),
      setSound: (sound) => set({ sound }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setLanguage: (language) => set({ language }),
    }),
    { name: "kobelgarten-settings" },
  ),
);
