import { useState } from "react";
import { potItemId, seedItems } from "../../content/items";
import { speciesById } from "../../content/plants";
import type { PotSize } from "../../engine/schemas";
import { itemName, plantName, t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";
import { playSound } from "../sound";
import { PlantCard } from "./PlantCard";
import { variegationLabel } from "./variegation";

const POT_SIZES: PotSize[] = ["small", "medium", "large"];

const POT_KEYS: Record<PotSize, MessageKey> = {
  small: "pot.small",
  medium: "pot.medium",
  large: "pot.large",
};

/** Was eingepflanzt werden soll: Shop-Samen oder Vermehrungsgut der Zucht. */
type PlantChoice =
  | { kind: "shop"; speciesId: string }
  | { kind: "propagule"; propaguleId: string };

interface ShelfSlotCardProps {
  slotIndex: number;
}

export function ShelfSlotCard({ slotIndex }: ShelfSlotCardProps) {
  const slot = useGameStore((state) => state.shelf[slotIndex]);
  const inventory = useGameStore((state) => state.inventory);
  const propagules = useGameStore((state) => state.propagules);
  const plantSeed = useGameStore((state) => state.plantSeed);
  const plantPropagule = useGameStore((state) => state.plantPropagule);
  const [choice, setChoice] = useState<PlantChoice | null>(null);
  if (!slot) return null;

  const placementLabel =
    slot.placement === "window"
      ? `🪟 ${t("slot.window")}`
      : `☁️ ${t("slot.shade")}`;

  const ownedSeeds = seedItems.filter(
    (item) => (inventory[item.id] ?? 0) > 0 && item.kind === "seed",
  );
  const ownedPropagules = Object.values(propagules);
  const ownedPots = POT_SIZES.filter(
    (size) => (inventory[potItemId(size)] ?? 0) > 0,
  );
  const canPlant =
    (ownedSeeds.length > 0 || ownedPropagules.length > 0) &&
    ownedPots.length > 0;

  const plantWithPot = (size: PotSize) => {
    if (!choice) return;
    playSound("plant");
    if (choice.kind === "shop") plantSeed(slotIndex, choice.speciesId, size);
    else plantPropagule(slotIndex, choice.propaguleId, size);
    setChoice(null);
  };

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
          ) : choice === null ? (
            <>
              <p className="text-xs text-hazel-500">{t("slot.plantPrompt")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ownedSeeds.map((item) =>
                  item.kind === "seed" ? (
                    <button
                      key={item.id}
                      onClick={() =>
                        setChoice({ kind: "shop", speciesId: item.speciesId })
                      }
                      className="rounded-full bg-leaf-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-leaf-700"
                    >
                      🌱 {itemName(item)} ×{inventory[item.id]}
                    </button>
                  ) : null,
                )}
                {ownedPropagules.map((propagule) => {
                  const variegated =
                    propagule.genome.variegation.type !== "none";
                  const species = speciesById[propagule.genome.speciesId];
                  return (
                    <button
                      key={propagule.id}
                      onClick={() =>
                        setChoice({
                          kind: "propagule",
                          propaguleId: propagule.id,
                        })
                      }
                      className="flex items-center gap-1.5 rounded-full bg-hazel-500 px-3 py-1 text-sm font-medium text-cream-50 transition hover:bg-hazel-700"
                    >
                      <span>
                        {propagule.kind === "cutting" ? "✂️" : "🌱"}{" "}
                        {species
                          ? plantName(species)
                          : propagule.genome.speciesId}{" "}
                        (
                        {t(
                          propagule.kind === "cutting"
                            ? "zucht.kind.cutting"
                            : "zucht.kind.seed",
                        )}
                        )
                      </span>
                      {/* Sichtbare Mutation: variegierte Vermehrungsgut hervorheben */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          variegated
                            ? "bg-leaf-100 text-leaf-900"
                            : "bg-cream-50/20 text-cream-50"
                        }`}
                      >
                        {variegated ? "✨ " : ""}
                        {variegationLabel(propagule.genome.variegation)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-hazel-500">{t("slot.choosePot")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ownedPots.map((size) => (
                  <button
                    key={size}
                    onClick={() => plantWithPot(size)}
                    className="rounded-full bg-hazel-500 px-3 py-1 text-sm font-medium text-cream-50 transition hover:bg-hazel-700"
                  >
                    🪴 {t(POT_KEYS[size])} ×{inventory[potItemId(size)]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setChoice(null)}
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
