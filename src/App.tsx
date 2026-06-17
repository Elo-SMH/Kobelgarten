import { useEffect, useState } from "react";
import { t } from "./i18n";
import { useSettingsStore } from "./state/settings";
import { useGameStore } from "./state/store";
import { TutorialOverlay } from "./ui/components/TutorialOverlay";
import { BreedingScreen } from "./ui/screens/BreedingScreen";
import { CharacterSelect } from "./ui/screens/CharacterSelect";
import { KobelScreen } from "./ui/screens/KobelScreen";
import { LexiconScreen } from "./ui/screens/LexiconScreen";
import { MenuScreen } from "./ui/screens/MenuScreen";
import { ShopScreen } from "./ui/screens/ShopScreen";
import { TalentScreen } from "./ui/screens/TalentScreen";
import { playSound } from "./ui/sound";

type Screen = "kobel" | "zucht" | "shop" | "talente" | "lexikon" | "menu";

export function App() {
  const [screen, setScreen] = useState<Screen>("kobel");
  const squirrelId = useGameStore((state) => state.squirrelId);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  useEffect(() => {
    const catchUp = () => useGameStore.getState().catchUp(Date.now());
    // Catch up missed (offline) ticks on start, then keep checking once a
    // second whether the next minute boundary has passed.
    catchUp();
    const interval = setInterval(catchUp, 1_000);
    return () => clearInterval(interval);
  }, []);

  // Reduzierte Animationen schalten eine Klasse am <html>, die index.css
  // auswertet (alle Transitions/Animationen werden praktisch deaktiviert).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reducedMotion);
  }, [reducedMotion]);

  // Erster Start: erst Eichhörnchen wählen, dann beginnt das Spiel.
  if (!squirrelId) return <CharacterSelect />;

  const go = (id: Screen) => {
    playSound("click");
    setScreen(id);
  };

  return (
    <div className="min-h-screen bg-cream-100 text-hazel-900">
      <nav className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-cream-300 bg-cream-50/90 px-4 py-2 backdrop-blur">
        {(
          [
            ["kobel", `🐿️ ${t("nav.kobel")}`],
            ["zucht", `🧬 ${t("nav.zucht")}`],
            ["shop", `🛒 ${t("nav.shop")}`],
            ["talente", `🌟 ${t("nav.talente")}`],
            ["lexikon", `📖 ${t("nav.lexikon")}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              screen === id
                ? "bg-leaf-500 text-white"
                : "text-hazel-700 hover:bg-cream-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => go("menu")}
          aria-label={t("nav.menu")}
          className={`ml-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            screen === "menu"
              ? "bg-leaf-500 text-white"
              : "text-hazel-700 hover:bg-cream-200"
          }`}
        >
          ⚙️
        </button>
      </nav>
      {screen === "kobel" ? (
        <KobelScreen />
      ) : screen === "zucht" ? (
        <BreedingScreen />
      ) : screen === "shop" ? (
        <ShopScreen />
      ) : screen === "talente" ? (
        <TalentScreen />
      ) : screen === "lexikon" ? (
        <LexiconScreen />
      ) : (
        <MenuScreen onClose={() => setScreen("kobel")} />
      )}
      <TutorialOverlay />
    </div>
  );
}
