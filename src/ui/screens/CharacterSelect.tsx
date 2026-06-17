import { useState } from "react";
import { allSquirrels } from "../../content/squirrels";
import { t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";
import { playSound } from "../sound";
import { SquirrelSprite } from "../components/SquirrelSprite";

/**
 * Eichhörnchen-Auswahl beim ersten Start (PLAN 2.6). Drei Charaktere, jeweils
 * rein kosmetisch plus ein Mini-Startbonus. Erst nach der Wahl beginnt das
 * eigentliche Spiel (und das Tutorial).
 */
export function CharacterSelect() {
  const chooseSquirrel = useGameStore((state) => state.chooseSquirrel);
  const [selected, setSelected] = useState<string | null>(null);

  const confirm = () => {
    if (!selected) return;
    playSound("levelup");
    chooseSquirrel(selected);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-leaf-900">
          🐿️ {t("character.heading")}
        </h1>
        <p className="mt-2 text-hazel-500">{t("character.hint")}</p>
      </header>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {allSquirrels.map((squirrel) => {
          const isSelected = selected === squirrel.id;
          return (
            <button
              key={squirrel.id}
              onClick={() => {
                playSound("click");
                setSelected(squirrel.id);
              }}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-5 text-center shadow-sm transition ${
                isSelected
                  ? "border-leaf-500 bg-leaf-100 ring-2 ring-leaf-500"
                  : "border-cream-300 bg-cream-50 hover:border-leaf-300"
              }`}
            >
              <SquirrelSprite squirrel={squirrel} size={80} />
              <span className="text-xl font-semibold text-leaf-900">
                {squirrel.name}
              </span>
              <span className="rounded-full bg-cream-200 px-3 py-1 text-xs font-medium text-hazel-700">
                {t(`squirrel.${squirrel.id}.bonus` as MessageKey)}
              </span>
              <span className="text-xs text-hazel-500">
                {t(`squirrel.${squirrel.id}.flavor` as MessageKey)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={confirm}
        disabled={!selected}
        className="mt-8 rounded-full bg-leaf-500 px-8 py-3 text-base font-semibold text-white shadow transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
      >
        {t("character.choose")}
      </button>
    </main>
  );
}
