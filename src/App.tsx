import { useEffect, useState } from "react";
import { t } from "./i18n";
import { useGameStore } from "./state/store";
import { BreedingScreen } from "./ui/screens/BreedingScreen";
import { KobelScreen } from "./ui/screens/KobelScreen";
import { LexiconScreen } from "./ui/screens/LexiconScreen";
import { ShopScreen } from "./ui/screens/ShopScreen";
import { TalentScreen } from "./ui/screens/TalentScreen";

type Screen = "kobel" | "zucht" | "shop" | "talente" | "lexikon";

export function App() {
  const [screen, setScreen] = useState<Screen>("kobel");

  useEffect(() => {
    const catchUp = () => useGameStore.getState().catchUp(Date.now());
    // Catch up missed (offline) ticks on start, then keep checking once a
    // second whether the next minute boundary has passed.
    catchUp();
    const interval = setInterval(catchUp, 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-cream-100 text-hazel-900">
      <nav className="sticky top-0 z-10 flex justify-center gap-2 border-b border-cream-300 bg-cream-50/90 px-4 py-2 backdrop-blur">
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
            onClick={() => setScreen(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              screen === id
                ? "bg-leaf-500 text-white"
                : "text-hazel-700 hover:bg-cream-200"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {screen === "kobel" ? (
        <KobelScreen />
      ) : screen === "zucht" ? (
        <BreedingScreen />
      ) : screen === "shop" ? (
        <ShopScreen />
      ) : screen === "talente" ? (
        <TalentScreen />
      ) : (
        <LexiconScreen />
      )}
    </div>
  );
}
