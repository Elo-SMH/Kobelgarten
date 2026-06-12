import { useState } from "react";
import { potItemId, seedItems, shopItemById } from "../../content/items";
import type { PotSize } from "../../engine/schemas";
import { t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";
import { PlantCard } from "./PlantCard";

const POT_SIZES: PotSize[] = ["small", "medium", "large"];

const POT_KEYS: Record<PotSize, MessageKey> = {
  small: "pot.small",
  medium: "pot.medium",
  large: "pot.large",
};

interface ShelfSlotCardProps {
  slotIndex: number;
}

export function ShelfSlotCard({ slotIndex }: ShelfSlotCardProps) {
  const slot = useGameStore((state) => state.shelf[slotIndex]);
  const inventory = useGameStore((state) => state.inventory);
  const plantSeed = useGameStore((state) => state.plantSeed);
  const [chosenSpecies, setChosenSpecies] = useState<string | null>(null);
  if (!slot) return null;

  const placementLabel =
    slot.placement === "window"
      ? `🪟 ${t("slot.window")}`
      : `☁️ ${t("slot.shade")}`;

  const ownedSeeds = seedItems.filter(
    (item) => (inventory[item.id] ?? 0) > 0 && item.kind === "seed",
  );
  const ownedPots = POT_SIZES.filter(
    (size) => (inventory[potItemId(size)] ?? 0) > 0,
  );
  const canPlant = ownedSeeds.length > 0 && ownedPots.length > 0;

  return (
    <div className="flex min-h-72 flex-col rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-sm">
      <span className="mb-2 self-center rounded-full bg-cream-200 px-3 py-0.5 text-xs font-medium text-hazel-700">
        {placementLabel}
      </span>
      {slot.plantId ? (
        <PlantCard plantId={slot.plantId} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-hazel-500">
            {t("slot.empty")}
          </p>
          {!canPlant ? (
            <p className="text-xs text-hazel-500">{t("slot.buyHint")}</p>
          ) : chosenSpecies === null ? (
            <>
              <p className="text-xs text-hazel-500">{t("slot.plantPrompt")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ownedSeeds.map((item) =>
                  item.kind === "seed" ? (
                    <button
                      key={item.id}
                      onClick={() => setChosenSpecies(item.speciesId)}
                      className="rounded-full bg-leaf-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-leaf-700"
                    >
                      🌱 {shopItemById[item.id]?.name ?? item.id} ×
                      {inventory[item.id]}
                    </button>
                  ) : null,
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-hazel-500">{t("slot.choosePot")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ownedPots.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      plantSeed(slotIndex, chosenSpecies, size);
                      setChosenSpecies(null);
                    }}
                    className="rounded-full bg-hazel-500 px-3 py-1 text-sm font-medium text-cream-50 transition hover:bg-hazel-700"
                  >
                    🪴 {t(POT_KEYS[size])} ×{inventory[potItemId(size)]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setChosenSpecies(null)}
                className="text-xs text-hazel-500 underline"
              >
                {t("slot.back")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
