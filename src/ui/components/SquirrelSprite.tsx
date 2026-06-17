import type { Squirrel } from "../../engine/schemas";

interface SquirrelSpriteProps {
  squirrel: Squirrel;
  /** Kantenlänge in px. */
  size?: number;
}

/**
 * Eichhörnchen-Sprite ohne Asset-Datei: ein in Fellfarbe getönter Kreis mit
 * Emoji-Gesicht (0 € Hosting). Die Farbe kommt aus den Squirrel-Daten.
 */
export function SquirrelSprite({ squirrel, size = 64 }: SquirrelSpriteProps) {
  return (
    <span
      aria-label={squirrel.name}
      role="img"
      className="inline-flex shrink-0 items-center justify-center rounded-full shadow-inner ring-2 ring-cream-50"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.56,
        backgroundColor: squirrel.color,
      }}
    >
      {squirrel.emoji}
    </span>
  );
}
