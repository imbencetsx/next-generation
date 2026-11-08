// A kis bányajelenetek (kezdőlap, bejelentkezés) robotjának fényei. A szülő adja a mezőméretet (--tile); a robot
// kelet felé néz.
//  - MineLight: a szimulátoréval azonos pixeles lámpafény (pixel-light.tsx) a jelenet bal felső sarkától.
//  - DrillSparks: a fúró hegyénél pattogó szikrák, amíg a robot ás.
// Díszítés, a felolvasók kihagyják; csökkentett mozgásnál a szikrák rejtettek (app/globals.css).

import PixelLight from "./pixel-light";

/** Kelet radiánban (a fénymodell irányai: 0 = kelet, y lefelé). */
const FACING_EAST = 0;

type Props = { cols: number; rows: number; robot: { x: number; y: number } };

/** @param cols, rows A megvilágított terület mezőben; ami a jeleneten kívül esik, levágódik. */
export function MineLight({ cols, rows, robot }: Props) {
  return (
    <PixelLight
      cols={cols}
      rows={rows}
      source={{ x: robot.x + 0.5, y: robot.y + 0.5, facing: FACING_EAST }}
      className="mine-light"
      style={{ width: `calc(${cols} * var(--tile))`, height: `calc(${rows} * var(--tile))` }}
    />
  );
}

/** A szikrák darabszáma; mind máskor és máshová pattan. */
const SPARKS = 5;

export function DrillSparks() {
  return (
    <span aria-hidden className="drill-sparks">
      {Array.from({ length: SPARKS }, (_, index) => (
        <i key={index} data-spark={index} />
      ))}
    </span>
  );
}
