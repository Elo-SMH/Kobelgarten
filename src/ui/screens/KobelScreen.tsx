import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { ShelfSlotCard } from "../components/ShelfSlotCard";

export function KobelScreen() {
  const tick = useGameStore((state) => state.tick);
  const hazelnuts = useGameStore((state) => state.hazelnuts);
  const slotCount = useGameStore((state) => state.shelf.length);
  const wateringCanLevel = useGameStore((state) => state.wateringCanLevel);
  const waterAll = useGameStore((state) => state.waterAll);

  return (
    <main className="flex flex-col items-center px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-leaf-900">
          🐿️ {t("app.title")}
        </h1>
        <p className="mt-1 text-hazel-500">{t("app.tagline")}</p>
      </header>

      <div className="mb-6 flex gap-4">
        <div className="rounded-2xl border border-cream-300 bg-cream-50 px-5 py-3 shadow-sm">
          <span className="block text-xs uppercase tracking-wide text-hazel-500">
            {t("kobel.tickLabel")}
          </span>
          <span className="text-2xl font-semibold tabular-nums">⏱️ {tick}</span>
        </div>
        <div className="rounded-2xl border border-cream-300 bg-cream-50 px-5 py-3 shadow-sm">
          <span className="block text-xs uppercase tracking-wide text-hazel-500">
            {t("kobel.hazelnutsLabel")}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            🌰 {hazelnuts}
          </span>
        </div>
      </div>

      <section className="w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-center gap-3">
          <h2 className="text-center text-2xl font-semibold text-leaf-900">
            {t("kobel.heading")}
          </h2>
          {wateringCanLevel >= 2 && (
            <button
              onClick={waterAll}
              className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-sky-600"
            >
              🚿 {t("kobel.waterAll")}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: slotCount }, (_, index) => (
            <ShelfSlotCard key={index} slotIndex={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
