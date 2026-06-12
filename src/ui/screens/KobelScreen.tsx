import { t } from "../../i18n";
import { useGameStore } from "../../state/store";

export function KobelScreen() {
  const tick = useGameStore((state) => state.tick);
  const hazelnuts = useGameStore((state) => state.hazelnuts);

  return (
    <main className="flex min-h-screen flex-col items-center bg-cream-100 px-4 py-8 text-hazel-900">
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

      <section className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-leaf-300 bg-leaf-100/50 p-12 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-leaf-900">
          {t("kobel.heading")}
        </h2>
        <p className="max-w-md text-hazel-700">{t("kobel.empty")}</p>
      </section>
    </main>
  );
}
