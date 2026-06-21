import { tutorialStepSchema, type TutorialStep } from "../engine/schemas";

/**
 * Geskripteter Einstieg (PLAN 2.7): kaufen → gießen → wachsen → verkaufen →
 * Steckling. Reine Daten — die Reihenfolge und welcher Spiel-Trigger einen
 * Schritt abschließt. Die Texte stehen unter `tutorial.<id>` in de.json, die
 * Fortschritts-Logik in engine/tutorial.ts.
 */
const rawSteps: TutorialStep[] = [
  { id: "welcome", trigger: "next" },
  { id: "buy-seed", trigger: "bought-seed" },
  { id: "buy-pot", trigger: "bought-pot" },
  { id: "plant", trigger: "planted" },
  { id: "water", trigger: "watered" },
  { id: "grow", trigger: "grew" },
  // Vermehren VOR Verkaufen: man schneidet den Steckling, solange die Pflanze
  // noch da ist — sonst stünde man nach dem Verkauf ohne Pflanze da.
  { id: "cutting", trigger: "cut" },
  { id: "sell", trigger: "sold" },
  { id: "done", trigger: "next" },
];

export const tutorialSteps: TutorialStep[] = rawSteps.map((step) =>
  tutorialStepSchema.parse(step),
);
