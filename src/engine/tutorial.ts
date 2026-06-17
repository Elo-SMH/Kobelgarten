import type { TutorialStep, TutorialTrigger } from "./schemas";

export interface TutorialState {
  /** Index in die Schritt-Liste; gilt nur solange `done` false ist. */
  step: number;
  /** Tutorial vollständig durchgespielt oder übersprungen. */
  done: boolean;
}

/**
 * Geskriptetes Tutorial als deterministischer Schritt-Automat (PLAN 2.7): ein
 * eingehender Spiel-Trigger schiebt den Fortschritt nur dann weiter, wenn er
 * exakt auf den Trigger des aktuellen Schritts passt. Nach dem letzten Schritt
 * ist das Tutorial `done`. Reine Funktion → testbar, kein Zustand, kein React.
 */
export function advanceTutorial(
  state: TutorialState,
  trigger: TutorialTrigger,
  steps: readonly TutorialStep[],
): TutorialState {
  if (state.done) return state;
  const current = steps[state.step];
  if (!current || current.trigger !== trigger) return state;
  const next = state.step + 1;
  if (next >= steps.length) return { step: next, done: true };
  return { step: next, done: false };
}

/** Tutorial sofort beenden (Spieler überspringt es). */
export function skipTutorial(steps: readonly TutorialStep[]): TutorialState {
  return { step: steps.length, done: true };
}
