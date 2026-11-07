// A pixel art sprite-ok közös adatai (public/sprites). Szerver- és kliensoldalon is importálható,
// ezért nincs "use client": a dokumentáció statikus térképe és a szimulátor is ezt használja.

import type { CSSProperties } from "react";
import type { Direction } from "@/lib/robot-map";

/** Egy sprite-képkocka mérete a képfájlban, pixelben. */
export const TILE = 32;

/** A mezők képei (public/sprites/<név>.png). */
export const TILES = {
  wall: "wall",
  /** Felfedezett (kiásott) mező. */
  dug: "empty-dirt",
  /** Fel nem fedezett mező és köd. */
  solid: "full_dirt",
} as const;
export type TileName = (typeof TILES)[keyof typeof TILES];

export const tileBackground = (name: TileName): CSSProperties => ({ backgroundImage: `url(/sprites/${name}.png)` });

// robot_sheet.png: 4×4 képkocka. Oszlopok: álló kép, majd három járásképkocka.
// A sorok a képen: le (dél), balra (nyugat), jobbra (kelet), fel (észak).
const SHEET_ROWS = 4;
const SHEET_ROW: Record<Direction, number> = { 0: 3, 1: 1, 2: 0, 3: 2 }; // észak, nyugat, dél, kelet

/**
 * A talp alatti üres hely képkockánként (az eredeti 32 px-es sprite pixeleiben). Ennyivel toljuk lejjebb
 * a robotot, hogy mindig a mező alján álljon. Sorrend: álló kép, járás 1–3.
 */
const FOOT_PADDING: Record<Direction, readonly [number, number, number, number]> = {
  0: [7, 7, 7, 7], // észak
  1: [4, 3, 4, 3], // nyugat
  2: [3, 2, 3, 2], // dél
  3: [5, 4, 4, 4], // kelet
};

const asPercentOfTile = (pixels: number) => `${(pixels / TILE) * 100}%`;

/**
 * A robot sprite-jának stílusa egy irányhoz: a megfelelő sor a képen és a talp-eltolások
 * CSS-változóként (a járásanimáció az app/globals.css-ben használja őket).
 */
export function robotSpriteStyle(dir: Direction): CSSProperties {
  const [idle, walk1, walk2, walk3] = FOOT_PADDING[dir];
  return {
    "backgroundPosition": `0% ${(SHEET_ROW[dir] * 100) / (SHEET_ROWS - 1)}%`,
    "--robot-foot-idle": asPercentOfTile(idle),
    "--robot-foot-walk-1": asPercentOfTile(walk1),
    "--robot-foot-walk-2": asPercentOfTile(walk2),
    "--robot-foot-walk-3": asPercentOfTile(walk3),
  } as CSSProperties;
}
