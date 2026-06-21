import type { PlantSpecies } from "../../engine/schemas";

export const monstera: PlantSpecies = {
  id: "monstera-deliciosa",
  name: "Monstera",
  basePrice: 80,
  growthTicks: 2400, // langsam (PLAN 3: Beispiel-Shape)
  mutability: 0.02, // mittel
  cuttingCost: 0.4, // langsam & kostbar: ein Schnitt wirft sie weit zurück
  waterDrainPerTick: 0.0008,
  lightNeed: "bright",
  crossGroup: "araceae",
  // Besonderheit: Albo = Endgame-Jackpot
  allowedVariegations: ["sectoral", "splash", "halfmoon", "albo"],
  leafShape: "fenestrated",
  palette: { base: "#2d6a4f", varieg: "#f1faee" },
};
