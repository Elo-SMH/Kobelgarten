import { CONFIG } from "../../content/config";
import { allSpecies } from "../../content/plants";
import {
  comboKey,
  reachableVariegations,
  totalComboCount,
} from "../../engine/lexicon";
import { t } from "../../i18n";
import { useGameStore } from "../../state/store";
import { VARIEG_KEYS } from "../components/variegation";

export function LexiconScreen() {
  const lexicon = useGameStore((state) => state.lexicon);
  const rewardsClaimed = useGameStore((state) => state.lexiconRewardsClaimed);

  const total = totalComboCount(allSpecies);
  const found = allSpecies.reduce(
    (sum, species) =>
      sum +
      reachableVariegations(species, allSpecies).filter(
        (type) => comboKey(species.id, type) in lexicon,
      ).length,
    0,
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-leaf-900">
          📖 {t("lexikon.heading")}
        </h1>
        <p className="mt-1 text-sm text-hazel-500">{t("lexikon.hint")}</p>
        <p className="mt-2 font-semibold text-hazel-700 tabular-nums">
          {t("lexikon.discoveredCount", { found, total })}
        </p>
      </header>

      <section className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 shadow-sm">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-hazel-500">
          🏆 {t("lexikon.rewardsHeading")}
        </h2>
        <ul className="flex flex-col gap-1">
          {CONFIG.lexicon.rewards.map((reward, index) => {
            const claimed = index < rewardsClaimed;
            return (
              <li
                key={reward.completion}
                className={`flex items-center justify-between text-sm ${
                  claimed ? "text-leaf-700" : "text-hazel-500"
                }`}
              >
                <span>
                  {claimed ? "✅" : "⬜"}{" "}
                  {t("lexikon.rewardLabel", {
                    percent: Math.round(reward.completion * 100),
                    hazelnuts: reward.hazelnuts,
                    xp: reward.xp,
                  })}
                </span>
                {claimed && (
                  <span className="text-xs font-medium">
                    {t("lexikon.rewardClaimed")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-4">
        {allSpecies.map((species) => {
          const types = reachableVariegations(species, allSpecies);
          return (
            <section
              key={species.id}
              className="rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-sm"
            >
              <h2 className="mb-2 font-semibold text-leaf-900">
                {species.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {types.map((type) => {
                  const discovered = comboKey(species.id, type) in lexicon;
                  return (
                    <span
                      key={type}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        discovered
                          ? "border-leaf-500 bg-leaf-100 text-leaf-900"
                          : "border-cream-300 bg-cream-100 text-hazel-300"
                      }`}
                      style={
                        discovered && type !== "none"
                          ? {
                              background: `linear-gradient(120deg, ${species.palette.base}22, ${species.palette.varieg})`,
                            }
                          : undefined
                      }
                    >
                      {discovered ? t(VARIEG_KEYS[type]) : t("lexikon.undiscovered")}
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
