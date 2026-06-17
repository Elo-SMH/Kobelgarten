import { useState } from "react";
import { CONFIG } from "../../content/config";
import { speciesById } from "../../content/plants";
import { allTalents } from "../../content/skills";
import { effectiveSellPrice, plantValue } from "../../engine/economy";
import { matchingCollector } from "../../engine/events";
import { phaseOf, type GrowthPhase } from "../../engine/growth";
import { computeModifiers } from "../../engine/skills";
import { t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";
import { playSound } from "../sound";
import { ConfirmDialog } from "./ConfirmDialog";
import { PlantSVG } from "./PlantSVG";

const PHASE_KEYS: Record<GrowthPhase, MessageKey> = {
  seed: "phase.seed",
  seedling: "phase.seedling",
  juvenile: "phase.juvenile",
  adult: "phase.adult",
  pracht: "phase.pracht",
};

interface PendingSale {
  plantId: string;
  name: string;
  value: number;
}

export function ShopSellTab() {
  const shelf = useGameStore((state) => state.shelf);
  const plants = useGameStore((state) => state.plants);
  const talentRanks = useGameStore((state) => state.talentRanks);
  const activeEvents = useGameStore((state) => state.activeEvents);
  const sellPlant = useGameStore((state) => state.sellPlant);
  const [pending, setPending] = useState<PendingSale | null>(null);

  // Gleiche Rechnung wie store.sellPlant: Wertformel × Talente × Sammler.
  const { sellPriceFactor } = computeModifiers(talentRanks, allTalents);

  const sellable = shelf.flatMap((slot) => {
    const plant = slot.plantId ? plants[slot.plantId] : undefined;
    if (!plant || plant.dead) return [];
    const species = speciesById[plant.genome.speciesId];
    if (!species) return [];
    return [{ plant, species }];
  });

  if (sellable.length === 0) {
    return (
      <p className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-8 text-center text-sm text-hazel-500">
        {t("shop.sellEmpty")}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {sellable.map(({ plant, species }) => {
          const baseValue = plantValue(plant, species, CONFIG.growth, CONFIG.economy);
          const quest = matchingCollector(
            activeEvents,
            plant.genome.variegation.type,
          );
          const value = effectiveSellPrice(
            baseValue,
            sellPriceFactor,
            quest?.priceFactor ?? 1,
          );
          const phase = phaseOf(plant.progress, CONFIG.growth);
          return (
            <li
              key={plant.id}
              className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2 shadow-sm"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden [&>svg]:h-16">
                <PlantSVG plant={plant} species={species} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{species.name}</p>
                <p className="text-xs text-hazel-500">{t(PHASE_KEYS[phase])}</p>
                {quest && (
                  <p className="text-xs font-semibold text-hazel-700">
                    🐿️{" "}
                    {t("shop.collectorBadge", { factor: quest.priceFactor })}
                  </p>
                )}
              </div>
              <span className="font-semibold tabular-nums">🌰 {value}</span>
              <button
                onClick={() => {
                  if (value >= CONFIG.shop.sellConfirmThreshold) {
                    setPending({ plantId: plant.id, name: species.name, value });
                  } else {
                    playSound("sell");
                    sellPlant(plant.id);
                  }
                }}
                className="rounded-full bg-hazel-500 px-4 py-1.5 text-sm font-medium text-cream-50 transition hover:bg-hazel-700"
              >
                {t("shop.sellAction")}
              </button>
            </li>
          );
        })}
      </ul>

      {pending && (
        <ConfirmDialog
          heading={t("shop.confirmHeading")}
          body={t("shop.confirmBody", {
            name: pending.name,
            value: pending.value,
          })}
          confirmLabel={t("shop.confirmYes")}
          cancelLabel={t("shop.confirmNo")}
          onConfirm={() => {
            playSound("sell");
            sellPlant(pending.plantId);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
