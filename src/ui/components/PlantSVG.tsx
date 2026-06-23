import { useMemo } from "react";
import { CONFIG } from "../../content/config";
import type { PlantInstance } from "../../engine/growth";
import { hashSeed } from "../../engine/rng";
import type { PlantSpecies } from "../../engine/schemas";
import { plantName } from "../../i18n";
import { plantLayout } from "./plantLayout";
import { VariegatedLeaf } from "./VariegatedLeaf";

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

  return (
    <svg
      viewBox="0 0 120 132"
      role="img"
      aria-label={plantName(species)}
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
            const leafProps = {
              shape: species.leafShape,
              palette: species.palette,
              variegation: plant.genome.variegation,
              roll: leaf.roll,
              clipId: `${plant.id}-leaf-${index}`,
              seed: hashSeed(`${plant.id}:leaf:${index}`),
            };
            if (species.leafShape === "blade") {
              // Blade leaves grow straight from the soil, no stem.
              const scaleY = Math.max(0.3, leaf.length / 38);
              return (
                <g
                  key={index}
                  transform={`translate(60 98) rotate(${angle}) scale(${leaf.scale * 0.8} ${scaleY})`}
                >
                  <VariegatedLeaf {...leafProps} />
                </g>
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
                <g
                  transform={`translate(${tipX} ${tipY}) rotate(${angle}) scale(${leaf.scale})`}
                >
                  <VariegatedLeaf {...leafProps} />
                </g>
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
