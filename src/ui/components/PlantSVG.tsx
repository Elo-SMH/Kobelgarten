import { useMemo } from "react";
import { CONFIG } from "../../content/config";
import type { PlantInstance } from "../../engine/growth";
import type { LeafShape, PlantSpecies } from "../../engine/schemas";
import { plantLayout } from "./plantLayout";

// Unit leaf paths: base at (0,0), pointing up.
const LEAF_PATHS: Record<LeafShape, string> = {
  heart: "M0 0 C7 -4 11 -14 0 -24 C-11 -14 -7 -4 0 0",
  blade: "M0 0 C3 -12 3 -28 0 -38 C-3 -28 -3 -12 0 0",
  arrow: "M0 0 C6 -3 9 -7 7 -13 L0 -24 L-7 -13 C-9 -7 -6 -3 0 0",
  fenestrated: "M0 0 C9 -4 13 -15 0 -26 C-13 -15 -9 -4 0 0",
};

interface PlantSVGProps {
  plant: PlantInstance;
  species: PlantSpecies;
}

export function PlantSVG({ plant, species }: PlantSVGProps) {
  const layout = useMemo(() => plantLayout(plant, CONFIG.growth), [plant]);

  const droop = plant.wilt * 28;
  const filter = plant.dead
    ? "grayscale(0.85) sepia(0.4) brightness(0.95)"
    : `hue-rotate(${plant.genome.hueShift}deg) saturate(${1 - 0.55 * plant.wilt})`;
  const path = LEAF_PATHS[species.leafShape];

  return (
    <svg
      viewBox="0 0 120 132"
      role="img"
      aria-label={species.name}
      className="mx-auto h-36 w-auto"
    >
      <ellipse cx="60" cy="97" rx="19" ry="3.5" fill="#5e4632" />
      <g style={{ filter }}>
        {layout.phase === "seed" ? (
          <ellipse cx="60" cy="92" rx="5" ry="3.5" fill="#7f5539" />
        ) : (
          layout.leaves.map((leaf, index) => {
            const angle = leaf.angle + droop * Math.sign(leaf.angle);
            const rad = (angle * Math.PI) / 180;
            if (species.leafShape === "blade") {
              // Blade leaves grow straight from the soil, no stem.
              const scaleY = leaf.length / 38;
              return (
                <path
                  key={index}
                  d={path}
                  fill={leaf.varieg ? species.palette.varieg : species.palette.base}
                  transform={`translate(60 98) rotate(${angle}) scale(${leaf.scale * 0.8} ${scaleY < 0.3 ? 0.3 : scaleY})`}
                />
              );
            }
            const tipX = 60 + Math.sin(rad) * leaf.length;
            const tipY = 98 - Math.cos(rad) * leaf.length;
            const ctrlX = 60 + Math.sin(rad) * leaf.length * 0.5;
            const ctrlY = 98 - Math.cos(rad) * leaf.length * 0.65;
            return (
              <g key={index}>
                <path
                  d={`M60 98 Q${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
                  fill="none"
                  stroke={species.palette.base}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d={path}
                  fill={leaf.varieg ? species.palette.varieg : species.palette.base}
                  transform={`translate(${tipX} ${tipY}) rotate(${angle}) scale(${leaf.scale})`}
                />
              </g>
            );
          })
        )}
      </g>
      <rect x="36" y="98" width="48" height="7" rx="2" fill="#9c6644" />
      <path d="M40 105 L80 105 L75 128 L45 128 Z" fill="#b08968" />
    </svg>
  );
}
