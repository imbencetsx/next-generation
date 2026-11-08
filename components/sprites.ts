// A pixel art sprite-ok közös adatai (public/sprites). Szerver- és kliensoldalon is importálható,
// ezért nincs "use client": a dokumentáció statikus térképe és a szimulátor is ezt használja.

import type { CSSProperties } from "react";
import type { Direction } from "@/lib/robot-map";

/** Egy sprite-képkocka mérete a képfájlban, pixelben. */
export const TILE = 32;

/** A mezők képei (public/sprites/<név>.png). */
export const TILES = {
  /** Felfedezett fal (a robot isThere-rel megvizsgálta). */
  wall: "wall",
  /** Még fel nem fedezett fal: sötétebb tégla, hogy köd nélkül is elkülönüljön (kiírás 3.4). */
  unexploredWall: "wall-unexplored",
  /** Felfedezett (kiásott) mező. */
  dug: "empty-dirt",
  /** Fel nem fedezett mező és köd. */
  solid: "full_dirt",
} as const;
export type TileName = (typeof TILES)[keyof typeof TILES];

export const tileBackground = (name: TileName): CSSProperties => ({ backgroundImage: `url(/sprites/${name}.png)` });

/**
 * Egy térképmező képe a futás közben. A felfedezett mező kiásott föld vagy világos tégla, a felfedezetlen
 * tömör föld vagy sötét tégla, így köd nélkül is látszik, mit fedezett fel a robot. Ködben a felfedezetlen
 * mező tartalma nem látszik: tömör föld.
 */
export function mapTile(wall: boolean, explored: boolean, fog = false): TileName {
  if (!explored) return fog ? TILES.solid : wall ? TILES.unexploredWall : TILES.solid;
  return wall ? TILES.wall : TILES.dug;
}

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

// A csillogás mezőnként eltolva indul, hogy ne villanjon egyszerre minden arany. A fázist egy egyszerű
// térbeli hash adja: két különböző prím szorzó miatt a szomszédos mezők (vízszintesen és függőlegesen is)
// más fázisba kerülnek. 10 fázis van, egymástól 0,16 s-ra.
const SHINE_HASH_X = 7;
const SHINE_HASH_Y = 13;
const SHINE_PHASES = 10;
const SHINE_PHASE_SECONDS = 0.16;

/** Negatív késleltetés: az animáció már a fázisa közepén jár, amikor a mező megjelenik. */
export function shineDelay(x: number, y: number): number {
  const phase = (x * SHINE_HASH_X + y * SHINE_HASH_Y) % SHINE_PHASES;
  return -phase * SHINE_PHASE_SECONDS;
}
