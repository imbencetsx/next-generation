// A robot mozgásának animációs adatai egy feldolgozott sor után: meddig csúszik, melyik mező mikor ásódik ki
// alatta, és milyen látványelem jár a sorhoz (bányászás, kiírás, falba ütközés). Csak megjelenítés;
// a szabályok a motorban vannak (lib/interpreter.ts), itt a két pillanatkép különbségét olvassuk ki.

import type { Machine, Snapshot, StepEvent } from "@/lib/interpreter";
import { cellIndex } from "@/lib/robot-map";

/** A legutóbbi lépés mozgása és látványelemei. */
export type Motion = {
  id: number;
  duration: number;
  cells: number;
  reveals: { index: number; at: number }[];
  /** Törmelék, szikra, buborék: Turbo sebességnél nincs idejük lejátszódni, ezért ott elmaradnak. */
  effects: boolean;
  /** A mező, ahonnan a robot ebben a sorban aranyat bányászott. */
  mined: number | null;
  printed: string | null;
  /** A lépés falba vagy a térkép szélébe ütközött (E_BEDROCK_HIT). */
  bump: boolean;
  /** A program hiba nélkül véget ért ezzel a sorral. */
  finished: boolean;
};

/** Egy mezőnyi csúszás ideje; gyors lejátszásnál a lépés idejébe kell beleférnie. */
const CELL_MS = 200;
/** A mozgás a lépésidő legfeljebb ekkora részét tölti ki, hogy a robot megálljon a következő lépés előtt. */
const MOTION_SHARE_OF_STEP = 0.85;
/** Ennél rövidebb lépésidőnél (Turbo) a látványelemek elmaradnak; a futás vége ilyenkor is látszik. */
const EFFECTS_MIN_DELAY_MS = 50;

/** Az a mező, ahonnan ebben a sorban eltűnt az arany (bányászás), vagy null. */
function minedCell(before: boolean[], after: boolean[]): number | null {
  const index = after.findIndex((hasGold, at) => before[at] && !hasGold);
  return index < 0 ? null : index;
}

/** A mező akkor ásódik ki, amikor a robot eleje beér (a mező felénél), nem a lépés indulásakor. */
function motionFor(
  id: number,
  before: Snapshot,
  after: Snapshot,
  event: StepEvent | null,
  cols: number,
  delay: number,
) {
  const path = event?.path ?? [];
  const duration = path.length ? Math.min(path.length * CELL_MS, delay * MOTION_SHARE_OF_STEP) : 0;
  const reveals = path.flatMap((cell, step) => {
    const index = cellIndex({ cols }, cell.x, cell.y);
    return before.explored[index] ? [] : [{ index, at: (duration * (step + 0.5)) / path.length }];
  });
  const motion: Motion = {
    id,
    duration,
    cells: path.length,
    reveals,
    effects: delay >= EFFECTS_MIN_DELAY_MS || after.status !== "running",
    mined: minedCell(before.gold, after.gold),
    printed: event?.printed ?? null,
    bump: after.error?.code === "E_BEDROCK_HIT",
    finished: after.status === "done",
  };
  return motion;
}

/** Egy sor feldolgozása a gépen: az új pillanatkép és a hozzá tartozó mozgásanimáció. */
export function advance(machine: Machine, motionId: number, cols: number, delay: number) {
  const before = machine.snapshot();
  const event = machine.step();
  const snapshot = machine.snapshot();
  return { snapshot, motion: motionFor(motionId, before, snapshot, event, cols, delay) };
}
