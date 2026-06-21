import type { PlantSpecies } from "../../engine/schemas";

export const calathea: PlantSpecies = {
  id: "calathea",
  name: "Calathea",
  basePrice: 60, // hoher Basiswert
  growthTicks: 1200, // mittel
  mutability: 0.01, // niedrig
  cuttingCost: 0.3, // mag das Schneiden nicht
  // Besonderheit: pflegeintensiv — säuft schnell leer, mag keinen Fensterplatz
  waterDrainPerTick: 0.002,
  lightNeed: "low",
  crossGroup: "marantaceae", // mit niemandem im Startsortiment kreuzbar
  allowedVariegations: ["splash", "sectoral"],
  leafShape: "heart",
  palette: { base: "#456b48", varieg: "#ecdff0" },
};
