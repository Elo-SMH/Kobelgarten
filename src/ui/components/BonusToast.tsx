import { useEffect } from "react";
import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { playSound } from "../sound";

/**
 * Kurzlebiger „Glückstreffer“-Hinweis, wenn ein Eichhörnchen-Chance-Bonus
 * trifft (Hasels doppelter Verkauf, Fips' Gratis-Steckling). Der Store setzt
 * `bonusToast`, diese Komponente zeigt ihn an, spielt einen Ton und lässt ihn
 * nach kurzer Zeit wieder ausblenden.
 */
export function BonusToast() {
  const toast = useGameStore((state) => state.bonusToast);
  const clearBonusToast = useGameStore((state) => state.clearBonusToast);

  useEffect(() => {
    if (!toast) return;
    playSound("levelup");
    const id = toast.id;
    const handle = setTimeout(() => clearBonusToast(id), 2600);
    return () => clearTimeout(handle);
  }, [toast, clearBonusToast]);

  if (!toast) return null;
  const BONUS_KEYS = {
    doubleSale: "bonus.doubleSale",
    freeCutting: "bonus.freeCutting",
    rescuedCutting: "bonus.rescuedCutting",
  } as const;
  const message = t(BONUS_KEYS[toast.kind]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        className="bonus-toast rounded-full border border-leaf-300 bg-leaf-100 px-5 py-2 text-sm font-semibold text-leaf-900 shadow-lg"
      >
        {message}
      </div>
    </div>
  );
}
