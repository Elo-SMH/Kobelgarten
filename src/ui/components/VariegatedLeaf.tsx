import type { ReactNode } from "react";
import { createRng, type Rng } from "../../engine/rng";
import type { Genome, LeafShape } from "../../engine/schemas";

// Unit leaf paths: base at (0,0), pointing up.
const LEAF_PATHS: Record<LeafShape, string> = {
  heart: "M0 0 C7 -4 11 -14 0 -24 C-11 -14 -7 -4 0 0",
  blade: "M0 0 C3 -12 3 -28 0 -38 C-3 -28 -3 -12 0 0",
  arrow: "M0 0 C6 -3 9 -7 7 -13 L0 -24 L-7 -13 C-9 -7 -6 -3 0 0",
  fenestrated: "M0 0 C9 -4 13 -15 0 -26 C-13 -15 -9 -4 0 0",
};

const LEAF_EXTENTS: Record<LeafShape, { height: number; halfWidth: number }> = {
  heart: { height: 24, halfWidth: 11 },
  blade: { height: 38, halfWidth: 3 },
  arrow: { height: 24, halfWidth: 9 },
  fenestrated: { height: 26, halfWidth: 13 },
};

interface VariegatedLeafProps {
  shape: LeafShape;
  palette: { base: string; varieg: string };
  variegation: Genome["variegation"];
  /** Per-leaf roll from plantLayout; decides whether this leaf shows the pattern. */
  roll: number;
  /** Globally unique id for this leaf's clip path. */
  clipId: string;
  /** Seed for deterministic per-leaf pattern geometry (Sprenkel, Sektoren). */
  seed: number;
}

/** Keil von der Blattbasis aus; Breite wächst mit coverage. */
function sectorPath(rng: Rng, height: number, coverage: number): string {
  const center = (rng.next() * 2 - 1) * 35;
  const halfAngle = 8 + coverage * 45;
  const r = height * 1.4;
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(Math.sin(rad) * r).toFixed(1)} ${(-Math.cos(rad) * r).toFixed(1)}`;
  };
  return `M0 0 L${point(center - halfAngle)} L${point(center + halfAngle)} Z`;
}

/**
 * Ein Blatt in lokalen Koordinaten (Basis bei 0/0, Spitze nach oben) mit
 * sichtbarem Variegations-Muster je Typ (PLAN 2.2: Variegation ist sichtbar):
 * marginata = heller Rand, halfmoon = halbe Blattfläche, splash = Sprenkel,
 * sectoral/albo = Sektoren (albo zusätzlich ganz weiße Blätter).
 */
export function VariegatedLeaf({
  shape,
  palette,
  variegation,
  roll,
  clipId,
  seed,
}: VariegatedLeafProps) {
  const path = LEAF_PATHS[shape];
  const { height, halfWidth } = LEAF_EXTENTS[shape];
  const { type, coverage } = variegation;

  let overlay: ReactNode = null;
  if (type !== "none" && coverage > 0) {
    const rng = createRng(seed);
    switch (type) {
      case "marginata": {
        // Heller Rand rundum: varieg-Blatt mit verkleinertem Basis-Blatt darauf.
        const inner = Math.max(0.35, 1 - coverage * 0.9);
        overlay = (
          <>
            <path d={path} fill={palette.varieg} />
            <path
              d={path}
              fill={palette.base}
              transform={`translate(0 ${-height / 2}) scale(${inner}) translate(0 ${height / 2})`}
            />
          </>
        );
        break;
      }
      case "splash": {
        const count = 3 + Math.round(coverage * 20);
        overlay = Array.from({ length: count }, (_, i) => (
          <circle
            key={i}
            cx={(rng.next() * 2 - 1) * halfWidth * 0.8}
            cy={-(0.1 + rng.next() * 0.8) * height}
            r={0.7 + rng.next() * 1.5}
            fill={palette.varieg}
          />
        ));
        break;
      }
      case "halfmoon": {
        // Eine Blatthälfte weiß; coverage steuert, wie viele Blätter betroffen
        // sind (ein Halfmoon-Blatt ist zur Hälfte hell → Faktor 2).
        if (roll < Math.min(1, coverage * 2)) {
          const left = rng.chance(0.5);
          overlay = (
            <rect
              x={left ? -halfWidth : 0}
              y={-height}
              width={halfWidth}
              height={height}
              fill={palette.varieg}
            />
          );
        }
        break;
      }
      case "sectoral": {
        if (roll < Math.min(1, coverage * 1.8)) {
          overlay = (
            <path d={sectorPath(rng, height, coverage)} fill={palette.varieg} />
          );
        }
        break;
      }
      case "albo": {
        // Der Jackpot-Look: breite Sektoren, bei hoher coverage ganz weiße Blätter.
        if (roll < coverage * 0.8) {
          overlay = <path d={path} fill={palette.varieg} />;
        } else if (roll < Math.min(1, coverage * 2.5)) {
          overlay = (
            <path
              d={sectorPath(rng, height, coverage + 0.2)}
              fill={palette.varieg}
            />
          );
        }
        break;
      }
    }
  }

  return (
    <g>
      <clipPath id={clipId}>
        <path d={path} />
      </clipPath>
      <path d={path} fill={palette.base} />
      {overlay !== null && <g clipPath={`url(#${clipId})`}>{overlay}</g>}
    </g>
  );
}
