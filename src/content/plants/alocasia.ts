import type { PlantSpecies } from "../../engine/schemas";

export const alocasia: PlantSpecies = {
  id: "alocasia",
  name: "Alocasia",
  basePrice: 120,
  growthTicks: 2200, // langsam
  mutability: 0.04, // hoch
  // Besonderheit: riskant — trocknet schnell aus und braucht den Fensterplatz
  // (die "niedrige hardiness" aus PLAN 2.8 ist hier als Pflege-Risiko abgebildet)
  waterDrainPerTick: 0.0022,
  lightNeed: "bright",
  crossGroup: "araceae",
  allowedVariegations: ["splash", "halfmoon", "albo"],
  leafShape: "arrow",
  palette: { base: "#274e36", varieg: "#dfe8e2" },
};
