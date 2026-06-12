import { speciesById } from "../../content/plants";
import type { ActiveEvent } from "../../engine/events";
import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { VARIEG_KEYS } from "./variegation";

/** Restlaufzeit eines Ereignisses, grob in Stunden oder Minuten. */
function remainingLabel(event: ActiveEvent, tick: number): string {
  const ticks = Math.max(0, event.expiresAtTick - tick);
  return ticks >= 60
    ? t("events.remainingHours", { hours: Math.round(ticks / 60) })
    : t("events.remainingMinutes", { minutes: ticks });
}

/**
 * Laufende Zufallsereignisse (PLAN 2.3) über dem Regal: Sammler-Quest,
 * Trauermücken (mit Gelbtafeln behandelbar) und Sonnenbrand.
 */
export function EventBanner() {
  const tick = useGameStore((state) => state.tick);
  const activeEvents = useGameStore((state) => state.activeEvents);
  const plants = useGameStore((state) => state.plants);
  const traps = useGameStore((state) => state.inventory["gelbtafeln"] ?? 0);
  const treatPlant = useGameStore((state) => state.treatPlant);

  if (activeEvents.length === 0) return null;

  const plantName = (plantId: string): string => {
    const plant = plants[plantId];
    const species = plant ? speciesById[plant.genome.speciesId] : undefined;
    return species?.name ?? plantId;
  };

  return (
    <section className="mb-6 flex w-full max-w-3xl flex-col gap-2">
      {activeEvents.map((event) => (
        <div
          key={event.id}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-2 text-sm shadow-sm ${
            event.kind === "collector"
              ? "border-hazel-300 bg-cream-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <span className="min-w-0 flex-1">
            {event.kind === "gnats" &&
              t("events.gnats", { plant: plantName(event.plantId) })}
            {event.kind === "sunburn" &&
              t("events.sunburn", { plant: plantName(event.plantId) })}
            {event.kind === "collector" &&
              t("events.collector", {
                factor: event.priceFactor,
                variegation: t(VARIEG_KEYS[event.variegation]),
              })}
          </span>
          <span className="shrink-0 text-xs text-hazel-500 tabular-nums">
            ⏳ {remainingLabel(event, tick)}
          </span>
          {event.kind === "gnats" &&
            (traps > 0 ? (
              <button
                onClick={() => treatPlant(event.plantId)}
                className="shrink-0 rounded-full bg-leaf-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-leaf-700"
              >
                🟨 {t("events.treatAction", { count: traps })}
              </button>
            ) : (
              <span className="shrink-0 text-xs text-hazel-500">
                {t("events.noTraps")}
              </span>
            ))}
        </div>
      ))}
    </section>
  );
}
