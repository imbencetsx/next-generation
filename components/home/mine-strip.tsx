// A kezdőlap szalagja: egy bánya keresztmetszete a játék saját sprite-jaiból (mennyezet, járat, talp), a tartalom
// szélességében. A robot kelet felé ás: a bánya folyamatosan elgördül mellette, így úgy tűnik, mintha haladna.
// Előtte tömör föld és arany (feltérképezetlen), mögötte kiásott járat; ahol átmegy, ott ásódik ki a föld. Az aranyat
// felszedi, a fúrója szikrázik, a lámpája bevilágítja a sötét járatot. Díszítő ábra, ezért a felolvasók
// kihagyják; csökkentett mozgás beállításnál minden áll (app/globals.css). A mezőméretet a szülő adja a --tile
// CSS-változóban, hogy a robot üdvözlő buborékja pontosan a robotra mutathasson (robot-greeting.tsx).

import RobotSprite from "@/components/robot-sprite";
import type { CSSProperties } from "react";
import GoldShine from "@/components/gold-shine";
import { DrillSparks, MineLight } from "@/components/scene/mine-light";
import { mapTile, robotSpriteStyle, tileBackground, TILES } from "@/components/sprites";

/** A robot oszlopa a szalagban (0-tól számolva). */
export const ROBOT_INDEX = 4;

/** A bánya mintája ennyi mezőnként ismétlődik; a görgetés egy minta hosszát teszi meg egy körben. */
const PATTERN = 12;
/** Ennyiszer ismételjük a mintát: a legszélesebb kijelzőt (≈ 48 mező) és egy teljes környi görgetést is lefedi. */
const REPEATS = 6;
/** Egy mezőnyi haladás ideje másodpercben. */
const CELL_SECONDS = 0.6;
const PERIOD_SECONDS = PATTERN * CELL_SECONDS;
/** A szalag sorai (mennyezet, járat, talp) és a járat sora. */
const ROWS = 3;
const TUNNEL_ROW = 1;
/** Ennyi oszlopot világít meg a lámpa: a legszélesebb kijelzőn is a szalag végéig ér. */
const LIT_COLUMNS = 48;
/** A járat aranyai a mintán belül (oszlop). */
const GOLD_AT = [3, 8];

/** Mennyezet és talp: fel nem fedezett sötét tégla (fal) és tömör föld (föld) váltakozva. */
type Rock = "wall" | "dirt";
const CEILING: Rock[] = [
  "wall",
  "wall",
  "dirt",
  "wall",
  "wall",
  "wall",
  "dirt",
  "dirt",
  "wall",
  "wall",
  "dirt",
  "wall",
];
const FLOOR: Rock[] = ["dirt", "wall", "wall", "wall", "dirt", "wall", "wall", "dirt", "wall", "wall", "wall", "dirt"];

/** Kelet felé néz (DIRECTIONS sorrendjében a 3.), a járat irányába. */
const FACING_EAST = 3;
/** Négy ugrás mezőnként (mint a szimulátorban), három képkocka ciklusonként. */
const WALK = `robot-walk ${(CELL_SECONDS / 4) * 3}s step-end infinite`;

export default function MineStrip() {
  const strip = {
    "--robot": ROBOT_INDEX,
    "--pattern": PATTERN,
  } as CSSProperties;

  return (
    <div aria-hidden className="mine-strip" style={strip}>
      <Track tile={(column) => mapTile(CEILING[column] === "wall", false)} />
      <div className="relative">
        <Track tile={() => TILES.dug} />
        {/* A tömör föld csak a robot előtt látszik: ahol a robot közepe áthalad, ott már kiásott a járat. */}
        <div className="mine-ahead">
          <Track tile={() => TILES.solid} gold={GOLD_AT} />
        </div>
      </div>
      <Track tile={(column) => mapTile(FLOOR[column] === "wall", false)} />

      <MineLight cols={LIT_COLUMNS} rows={ROWS} robot={{ x: ROBOT_INDEX, y: TUNNEL_ROW }} />
      <span className="mine-robot">
        <RobotSprite className="absolute inset-0" style={{ ...robotSpriteStyle(FACING_EAST), animation: WALK }} />
        <DrillSparks />
      </span>
    </div>
  );
}

type TrackProps = { tile: (column: number) => Parameters<typeof tileBackground>[0]; gold?: number[] };

/** A görgetés négy ugrással lép mezőnként, mint a szimulátor robotja. */
const SCROLL = `mine-scroll ${PERIOD_SECONDS}s steps(${PATTERN * 4}, end) infinite`;

/** Egy elgördülő mezősor: a minta többször egymás után. */
function Track({ tile, gold = [] }: TrackProps) {
  return (
    <div className="mine-track" style={{ animation: SCROLL }}>
      {Array.from({ length: PATTERN * REPEATS }, (_, index) => {
        const column = index % PATTERN;
        return (
          // A sor rögzített, sosem változik, ezért az index stabil kulcs.
          <div
            key={index}
            className="pixel-sprite relative size-(--tile) shrink-0"
            style={tileBackground(tile(column))}
          >
            {gold.includes(column) && <GoldShine x={index} y={0} />}
          </div>
        );
      })}
    </div>
  );
}
