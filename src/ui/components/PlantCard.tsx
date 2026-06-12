import { CONFIG } from "../../content/config";
import { speciesById } from "../../content/plants";
import { phaseOf, type GrowthPhase } from "../../engine/growth";
import { t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";
import { NeedBar } from "./NeedBar";
import { PlantSVG } from "./PlantSVG";

const PHASE_KEYS: Record<GrowthPhase, MessageKey> = {
  seed: "phase.seed",
  seedling: "phase.seedling",
  juvenile: "phase.juvenile",
  adult: "phase.adult",
  pracht: "phase.pracht",
};

interface PlantCardProps {
  plantId: string;
}

export function PlantCard({ plantId }: PlantCardProps) {
  const plant = useGameStore((state) => state.plants[plantId]);
  const waterPlant = useGameStore((state) => state.waterPlant);
  const removePlant = useGameStore((state) => state.removePlant);
  if (!plant) return null;
  const species = speciesById[plant.genome.speciesId];
  if (!species) return null;

  const phase = phaseOf(plant.progress, CONFIG.growth);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{species.name}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            plant.dead
              ? "bg-cream-200 text-hazel-700"
              : "bg-leaf-100 text-leaf-900"
          }`}
        >
          {plant.dead ? `🥀 ${t("plant.deadLabel")}` : t(PHASE_KEYS[phase])}
        </span>
      </div>

      <PlantSVG plant={plant} species={species} />

      <NeedBar
        label={t("plant.waterNeed")}
        value={plant.water}
        colorClass="bg-sky-400"
      />
      <NeedBar
        label={t("plant.healthNeed")}
        value={1 - plant.wilt}
        colorClass="bg-leaf-500"
      />
      <NeedBar
        label={t("plant.growthLabel")}
        value={plant.progress / CONFIG.growth.prachtProgress}
        colorClass="bg-hazel-300"
      />

      {plant.dead ? (
        <button
          onClick={() => removePlant(plant.id)}
          className="mt-1 rounded-full bg-hazel-500 px-4 py-1.5 text-sm font-medium text-cream-50 transition hover:bg-hazel-700"
        >
          🗑️ {t("plant.removeAction")}
        </button>
      ) : (
        <button
          onClick={() => waterPlant(plant.id)}
          disabled={plant.water > 0.98}
          className="mt-1 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
        >
          💧 {t("plant.waterAction")}
        </button>
      )}
    </div>
  );
}
