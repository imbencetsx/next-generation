// A kezdőlap szalagja: egy bányajárat a játék saját sprite-jaiból, a tartalom szélességében. Azt mutatja, amiről
// a játék szól: a robot kelet felé halad; mögötte a felfedezett rész (kiásott föld, világos tégla), előtte a még
// feltérképezetlen (tömör föld, sötét tégla), útközben arannyal. Díszítő ábra, ezért a felolvasók kihagyják.
// A robot helyben jár, az arany csillog; csökkentett mozgás beállításnál mindkettő áll (app/globals.css). A mezőméretet a szülő adja a
// --tile CSS-változóban, hogy a robot üdvözlő buborékja pontosan a robotra mutathasson (robot-greeting.tsx).

import GoldShine from "@/components/gold-shine";
import { mapTile, robotSpriteStyle, tileBackground } from "@/components/sprites";

type Cell = { wall?: boolean; explored?: boolean; gold?: boolean; robot?: boolean };

const EXPLORED: Cell = { explored: true };
const UNEXPLORED: Cell = {};
const UNEXPLORED_WALL: Cell = { wall: true };
const UNEXPLORED_GOLD: Cell = { gold: true };

/** A robot mezője a járatban (0-tól számolva). */
export const ROBOT_INDEX = 4;

/** A már bejárt rész: fal, kiásott föld, a robot, és előtte a megvizsgált mező a következő arannyal. */
const BEHIND_AND_AHEAD: Cell[] = [
  { wall: true, explored: true },
  EXPLORED,
  EXPLORED,
  EXPLORED,
  { explored: true, robot: true },
  // A robot előtti mezőt már megvizsgálta (isThere), ezért felfedezett: ott vár a következő arany.
  { explored: true, gold: true },
];

/** A feltérképezetlen rész mintája; ismételve tölti ki a szélesebb képernyőket is. */
const UNEXPLORED_PATTERN: Cell[] = [
  UNEXPLORED,
  UNEXPLORED,
  UNEXPLORED_GOLD,
  UNEXPLORED_WALL,
  UNEXPLORED,
  UNEXPLORED,
  UNEXPLORED,
  UNEXPLORED_GOLD,
  UNEXPLORED,
  UNEXPLORED_WALL,
  UNEXPLORED_WALL,
];

/** Elég mező a legszélesebb kijelzőhöz is (48 × 56 px ≈ 2700 px); ami nem fér ki, levágódik. */
const TUNNEL_LENGTH = 48;
const TUNNEL: Cell[] = Array.from({ length: TUNNEL_LENGTH }, (_, index) =>
  index < BEHIND_AND_AHEAD.length
    ? BEHIND_AND_AHEAD[index]
    : UNEXPLORED_PATTERN[(index - BEHIND_AND_AHEAD.length) % UNEXPLORED_PATTERN.length],
);

/** Kelet felé néz (DIRECTIONS sorrendjében a 3.), a járat irányába. */
const FACING_EAST = 3;
const WALK_IN_PLACE = "robot-walk 0.48s step-end infinite";

export default function MineStrip() {
  return (
    <div aria-hidden className="flex overflow-hidden border-2 border-foreground shadow-[0_4px_0_var(--foreground)]">
      {TUNNEL.map((cell, index) => (
        // A járat rögzített, sosem változik, ezért az index stabil kulcs.
        <div
          key={index}
          className="pixel-sprite relative size-(--tile) shrink-0"
          style={tileBackground(mapTile(cell.wall ?? false, cell.explored ?? false))}
        >
          {cell.gold && <GoldShine x={index} y={0} />}
          {cell.robot && (
            <span
              className="pixel-robot-sprite absolute inset-0"
              style={{ ...robotSpriteStyle(FACING_EAST), animation: WALK_IN_PLACE }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
