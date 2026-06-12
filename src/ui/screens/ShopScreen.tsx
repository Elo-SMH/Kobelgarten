import { useState } from "react";
import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { ShopBuyTab } from "../components/ShopBuyTab";
import { ShopSellTab } from "../components/ShopSellTab";

type ShopTab = "buy" | "sell";

export function ShopScreen() {
  const [tab, setTab] = useState<ShopTab>("buy");
  const hazelnuts = useGameStore((state) => state.hazelnuts);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-leaf-900">
          🛒 {t("shop.heading")}
        </h1>
        <div className="rounded-2xl border border-cream-300 bg-cream-50 px-5 py-2 shadow-sm">
          <span className="text-xl font-semibold tabular-nums">
            🌰 {hazelnuts}
          </span>
        </div>
      </header>

      <div className="mb-6 flex gap-2">
        {(
          [
            ["buy", t("shop.buyTab")],
            ["sell", t("shop.sellTab")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === id
                ? "bg-hazel-500 text-cream-50"
                : "bg-cream-200 text-hazel-700 hover:bg-cream-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "buy" ? <ShopBuyTab /> : <ShopSellTab />}
    </main>
  );
}
