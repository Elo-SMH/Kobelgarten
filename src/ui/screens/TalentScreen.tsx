import { CONFIG } from "../../content/config";
import { allTalents, talentTrees } from "../../content/skills";
import type { TalentTree } from "../../engine/schemas";
import {
  isTierUnlocked,
  levelProgress,
  pointsInTree,
  pointsSpent,
  respecCost,
  totalSkillPoints,
} from "../../engine/skills";
import { talentName, t, type MessageKey } from "../../i18n";
import { useGameStore } from "../../state/store";

const TREE_KEYS: Record<TalentTree, MessageKey> = {
  gaertner: "talents.tree.gaertner",
  zuechter: "talents.tree.zuechter",
  haendler: "talents.tree.haendler",
};

const TREE_EMOJI: Record<TalentTree, string> = {
  gaertner: "🌱",
  zuechter: "🧬",
  haendler: "🛒",
};

export function TalentScreen() {
  const xp = useGameStore((state) => state.xp);
  const hazelnuts = useGameStore((state) => state.hazelnuts);
  const talentRanks = useGameStore((state) => state.talentRanks);
  const spendTalentPoint = useGameStore((state) => state.spendTalentPoint);
  const respec = useGameStore((state) => state.respec);

  const progress = levelProgress(xp, CONFIG.progression.xpCurve);
  const spent = pointsSpent(talentRanks);
  const available = totalSkillPoints(progress.level) - spent;
  const cost = respecCost(spent, CONFIG.progression);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-center text-3xl font-bold text-leaf-900">
        🌟 {t("talents.heading")}
      </h1>

      <section className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-5 py-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-leaf-900">
            {t("kobel.levelLabel")} {progress.level}
          </span>
          <span className="text-sm text-hazel-500 tabular-nums">
            {progress.needed > 0
              ? t("kobel.xpProgress", {
                  into: progress.into,
                  needed: progress.needed,
                })
              : t("kobel.maxLevel")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cream-200">
          <div
            className="h-full rounded-full bg-leaf-500 transition-all"
            style={{
              width: `${
                progress.needed > 0
                  ? Math.round((progress.into / progress.needed) * 100)
                  : 100
              }%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-hazel-700">
            ✨ {t("talents.pointsAvailable", { count: available })}
          </span>
          <button
            onClick={respec}
            disabled={spent === 0 || hazelnuts < cost}
            title={t("talents.respecHint")}
            className="rounded-full bg-hazel-500 px-3 py-1 text-xs font-medium text-cream-50 transition hover:bg-hazel-700 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
          >
            ♻️ {t("talents.respecAction", { cost })}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {talentTrees.map((tree) => {
          const treeTalents = allTalents
            .filter((talent) => talent.tree === tree)
            .sort((a, b) => a.tier - b.tier);
          const treePoints = pointsInTree(talentRanks, allTalents, tree);
          return (
            <section
              key={tree}
              className="flex flex-col gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-sm"
            >
              <header className="text-center">
                <h2 className="text-xl font-semibold text-leaf-900">
                  {TREE_EMOJI[tree]} {t(TREE_KEYS[tree])}
                </h2>
                <p className="text-xs text-hazel-500">
                  {t("talents.treePoints", { points: treePoints })}
                </p>
              </header>
              {treeTalents.map((talent) => {
                const rank = talentRanks[talent.id] ?? 0;
                const unlocked = isTierUnlocked(
                  talent.tier,
                  treePoints,
                  CONFIG.progression.tierThresholds,
                );
                const maxed = rank >= talent.maxRank;
                const canSpend = unlocked && !maxed && available > 0;
                return (
                  <div
                    key={talent.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      unlocked
                        ? "border-cream-300 bg-white"
                        : "border-cream-200 bg-cream-100 opacity-60"
                    }`}
                  >
                    <span className="text-xl" aria-hidden>
                      {talent.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {talentName(talent)}{" "}
                        <span className="font-normal text-hazel-300">
                          · {t("talents.tierLabel", { tier: talent.tier })}
                        </span>
                      </p>
                      <p className="text-xs text-hazel-500">
                        {t(`talent.${talent.id}.desc` as MessageKey)}
                      </p>
                      {!unlocked && (
                        <p className="text-xs font-medium text-hazel-700">
                          🔒{" "}
                          {t("talents.tierLocked", {
                            points:
                              CONFIG.progression.tierThresholds[talent.tier - 1],
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-hazel-500 tabular-nums">
                        {t("talents.rankLabel", {
                          rank,
                          max: talent.maxRank,
                        })}
                      </span>
                      {maxed ? (
                        <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-medium text-leaf-900">
                          ✓ {t("talents.maxedLabel")}
                        </span>
                      ) : (
                        <button
                          onClick={() => spendTalentPoint(talent.id)}
                          disabled={!canSpend}
                          className="rounded-full bg-leaf-500 px-3 py-0.5 text-xs font-medium text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
                        >
                          {t("talents.spendAction")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </main>
  );
}
