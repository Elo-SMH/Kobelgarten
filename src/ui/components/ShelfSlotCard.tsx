import { allSpecies } from "../../content/plants";
import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { PlantCard } from "./PlantCard";

interface ShelfSlotCardProps {
  slotIndex: number;
}

export function ShelfSlotCard({ slotIndex }: ShelfSlotCardProps) {
  const slot = useGameStore((state) => state.shelf[slotIndex]);
  const plantSeed = useGameStore((state) => state.plantSeed);
  if (!slot) return null;

  const placementLabel =
    slot.placement === "window"
      ? `🪟 ${t("slot.window")}`
      : `☁️ ${t("slot.shade")}`;

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
          <p className="text-xs text-hazel-500">{t("slot.plantPrompt")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {allSpecies.map((species) => (
              <button
                key={species.id}
                onClick={() => plantSeed(slotIndex, species.id)}
                className="rounded-full bg-leaf-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-leaf-700"
              >
                🌱 {species.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
