// Csillogó aranyrög egy mezőn (a szimulátoréval azonos animáció). A fázist a mező helye adja (shineDelay),
// így a szomszédos rögök nem villannak egyszerre. Csökkentett mozgás beállításnál áll (app/globals.css).

import type { CSSProperties } from "react";
import { shineDelay } from "@/components/sprites";

export default function GoldShine({ x, y }: { x: number; y: number }) {
  return (
    <span className="gold-shine" style={{ "--shine-delay": `${shineDelay(x, y)}s` } as CSSProperties}>
      <i className="gold-sprite gold-sparkle absolute inset-0" />
    </span>
  );
}
