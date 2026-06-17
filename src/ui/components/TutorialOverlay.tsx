import { squirrelById } from "../../content/squirrels";
import { tutorialSteps } from "../../content/tutorial";
import { t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";
import { playSound } from "../sound";
import { SpeechBubble } from "./SpeechBubble";

/**
 * Geskriptetes Tutorial (PLAN 2.7) als nicht-blockierende Sprechblase unten:
 * Erzähl-Schritte ziehen den Spieler per „Weiter“ weiter, Aktions-Schritte
 * warten auf das jeweilige Spielereignis (kaufen/gießen/wachsen/verkaufen/
 * Steckling), das der Store automatisch meldet.
 */
export function TutorialOverlay() {
  const squirrelId = useGameStore((state) => state.squirrelId);
  const tutorialStep = useGameStore((state) => state.tutorialStep);
  const tutorialDone = useGameStore((state) => state.tutorialDone);
  const advanceTutorial = useGameStore((state) => state.advanceTutorial);
  const skipTutorial = useGameStore((state) => state.skipTutorial);

  if (tutorialDone || !squirrelId) return null;
  const squirrel = squirrelById[squirrelId];
  const step = tutorialSteps[tutorialStep];
  if (!squirrel || !step) return null;

  const isNarration = step.trigger === "next";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto">
        <SpeechBubble
          squirrel={squirrel}
          actions={
            <>
              {isNarration && (
                <button
                  onClick={() => {
                    playSound("click");
                    advanceTutorial("next");
                  }}
                  className="rounded-full bg-leaf-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-leaf-700"
                >
                  {t("tutorial.next")}
                </button>
              )}
              <button
                onClick={() => {
                  playSound("click");
                  skipTutorial();
                }}
                className="rounded-full bg-cream-200 px-4 py-1.5 text-sm font-medium text-hazel-700 transition hover:bg-cream-300"
              >
                {t("tutorial.skip")}
              </button>
            </>
          }
        >
          <p className="font-semibold text-leaf-900">
            {t(`tutorial.${step.id}.title` as MessageKey)}
          </p>
          <p className="mt-0.5">
            {t(`tutorial.${step.id}.body` as MessageKey)}
          </p>
        </SpeechBubble>
      </div>
    </div>
  );
}
