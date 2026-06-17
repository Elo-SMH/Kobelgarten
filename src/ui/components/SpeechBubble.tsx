import type { ReactNode } from "react";
import type { Squirrel } from "../../engine/schemas";
import { SquirrelSprite } from "./SquirrelSprite";

interface SpeechBubbleProps {
  squirrel: Squirrel;
  children: ReactNode;
  /** Optionale Aktionsleiste (Weiter / Überspringen). */
  actions?: ReactNode;
}

/**
 * Sprechblase des Eichhörnchens (PLAN 2.6): Sprite links, getönte Blase
 * rechts mit kleinem Schnabel. Vermittelt Tutorial-Schritte und Flavor.
 */
export function SpeechBubble({ squirrel, children, actions }: SpeechBubbleProps) {
  return (
    <div className="flex items-end gap-3">
      <SquirrelSprite squirrel={squirrel} size={56} />
      <div className="relative max-w-md rounded-2xl rounded-bl-sm border border-cream-300 bg-cream-50 px-4 py-3 shadow-md">
        <span
          aria-hidden
          className="absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 border-b border-l border-cream-300 bg-cream-50"
        />
        <div className="text-sm leading-relaxed text-hazel-700">{children}</div>
        {actions && (
          <div className="mt-3 flex flex-wrap justify-end gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
