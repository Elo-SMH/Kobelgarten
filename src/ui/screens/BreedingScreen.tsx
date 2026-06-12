import { useState } from "react";
import { CONFIG } from "../../content/config";
import { speciesById } from "../../content/plants";
import { allTalents } from "../../content/skills";
import { canCross } from "../../engine/genetics";
import { phaseOf, type PlantInstance } from "../../engine/growth";
import type { Genome } from "../../engine/schemas";
import { computeModifiers } from "../../engine/skills";
import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { PlantSVG } from "../components/PlantSVG";
import { variegationLabel } from "../components/variegation";

/** Genwerte-Zeile fürs Geschulte Auge (Züchter-Talent). */
function geneReadout(genome: Genome): string {
  return t("zucht.geneReadout", {
    growth: genome.growthRate.toFixed(2),
    size: genome.size.toFixed(2),
    hardiness: genome.hardiness.toFixed(2),
    stability: genome.variegation.stability.toFixed(2),
  });
}

export function BreedingScreen() {
  const plants = useGameStore((state) => state.plants);
  const shelf = useGameStore((state) => state.shelf);
  const propagules = useGameStore((state) => state.propagules);
  const talentRanks = useGameStore((state) => state.talentRanks);
  const cutCutting = useGameStore((state) => state.cutCutting);
  const crossPlants = useGameStore((state) => state.crossPlants);
  const [parents, setParents] = useState<string[]>([]);

  const { revealGenes } = computeModifiers(talentRanks, allTalents);

  // Regal-Reihenfolge, damit die Liste stabil bleibt.
  const shelfPlants = shelf
    .map((slot) => (slot.plantId ? plants[slot.plantId] : undefined))
    .filter((plant): plant is PlantInstance => !!plant && !plant.dead);

  const cuttable = shelfPlants.filter((plant) => {
    const phase = phaseOf(plant.progress, CONFIG.growth);
    return phase === "juvenile" || phase === "adult" || phase === "pracht";
  });
  const crossable = shelfPlants.filter((plant) => {
    const phase = phaseOf(plant.progress, CONFIG.growth);
    return phase === "adult" || phase === "pracht";
  });

  const selected = parents
    .map((id) => plants[id])
    .filter((plant): plant is PlantInstance => !!plant);
  const selectedSpecies = selected.map(
    (plant) => speciesById[plant.genome.speciesId],
  );
  const incompatible =
    selectedSpecies.length === 2 &&
    !canCross(selectedSpecies[0], selectedSpecies[1]);

  const toggleParent = (plantId: string) => {
    setParents((current) =>
      current.includes(plantId)
        ? current.filter((id) => id !== plantId)
        : [...current.slice(-1), plantId],
    );
  };

  const doCross = () => {
    if (parents.length !== 2 || incompatible) return;
    crossPlants(parents[0], parents[1]);
    setParents([]);
  };

  const propaguleList = Object.values(propagules);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <h1 className="text-center text-3xl font-bold text-leaf-900">
        🧬 {t("zucht.heading")}
      </h1>

      <section>
        <h2 className="mb-1 text-xl font-semibold text-leaf-900">
          ✂️ {t("zucht.cutHeading")}
        </h2>
        <p className="mb-3 text-sm text-hazel-500">{t("zucht.cutHint")}</p>
        {cuttable.length === 0 ? (
          <p className="rounded-2xl border border-cream-300 bg-cream-50 p-4 text-sm text-hazel-500">
            {t("zucht.cutEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cuttable.map((plant) => {
              const species = speciesById[plant.genome.speciesId];
              return (
                <div
                  key={plant.id}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-cream-300 bg-cream-50 p-3 shadow-sm"
                >
                  <span className="text-sm font-semibold">{species.name}</span>
                  <span className="text-xs text-hazel-500">
                    {variegationLabel(plant.genome.variegation)}
                  </span>
                  {revealGenes && (
                    <span className="text-center text-[10px] text-hazel-500">
                      🔍 {geneReadout(plant.genome)}
                    </span>
                  )}
                  <PlantSVG plant={plant} species={species} />
                  <button
                    onClick={() => cutCutting(plant.id)}
                    className="rounded-full bg-leaf-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-leaf-700"
                  >
                    ✂️ {t("zucht.cutAction")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold text-leaf-900">
          🌸 {t("zucht.crossHeading")}
        </h2>
        <p className="mb-3 text-sm text-hazel-500">{t("zucht.crossHint")}</p>
        {crossable.length < 2 ? (
          <p className="rounded-2xl border border-cream-300 bg-cream-50 p-4 text-sm text-hazel-500">
            {t("zucht.crossEmpty")}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {crossable.map((plant) => {
                const species = speciesById[plant.genome.speciesId];
                const isSelected = parents.includes(plant.id);
                return (
                  <button
                    key={plant.id}
                    onClick={() => toggleParent(plant.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-left shadow-sm transition ${
                      isSelected
                        ? "border-leaf-500 bg-leaf-100 ring-2 ring-leaf-500"
                        : "border-cream-300 bg-cream-50 hover:border-leaf-500"
                    }`}
                  >
                    <span className="text-sm font-semibold">
                      {species.name}
                    </span>
                    <span className="text-xs text-hazel-500">
                      {variegationLabel(plant.genome.variegation)}
                    </span>
                    {revealGenes && (
                      <span className="text-center text-[10px] text-hazel-500">
                        🔍 {geneReadout(plant.genome)}
                      </span>
                    )}
                    <PlantSVG plant={plant} species={species} />
                    {isSelected && (
                      <span className="rounded-full bg-leaf-500 px-2 py-0.5 text-xs text-white">
                        ✓ {t("zucht.selectedLabel")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={doCross}
                disabled={parents.length !== 2 || incompatible}
                className="rounded-full bg-hazel-500 px-5 py-2 text-sm font-medium text-cream-50 transition hover:bg-hazel-700 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
              >
                🧬 {t("zucht.crossAction")}
              </button>
              {incompatible && (
                <span className="text-sm text-hazel-500">
                  {t("zucht.crossIncompatible")}
                </span>
              )}
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold text-leaf-900">
          🧺 {t("zucht.inventoryHeading")}
        </h2>
        {propaguleList.length === 0 ? (
          <p className="rounded-2xl border border-cream-300 bg-cream-50 p-4 text-sm text-hazel-500">
            {t("zucht.inventoryEmpty")}
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-hazel-500">{t("zucht.plantHint")}</p>
            <ul className="flex flex-col gap-2">
              {propaguleList.map((propagule) => {
                const species = speciesById[propagule.genome.speciesId];
                return (
                  <li
                    key={propagule.id}
                    className="flex items-center justify-between rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2 shadow-sm"
                  >
                    <span className="font-medium">
                      {propagule.kind === "cutting" ? "✂️" : "🌱"}{" "}
                      {species?.name ?? propagule.genome.speciesId}{" "}
                      <span className="text-xs text-hazel-500">
                        (
                        {t(
                          propagule.kind === "cutting"
                            ? "zucht.kind.cutting"
                            : "zucht.kind.seed",
                        )}
                        )
                      </span>
                    </span>
                    <span className="text-xs text-hazel-500">
                      {variegationLabel(propagule.genome.variegation)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
