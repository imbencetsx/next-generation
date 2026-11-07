// A robot mozgásának animációs adatai egy feldolgozott sor után: meddig csúszik, és melyik mező mikor
// ásódik ki alatta. Csak megjelenítés; a mozgás szabályai a motorban vannak (lib/interpreter.ts).

import type { Machine, Snapshot, StepEvent } from "@/lib/interpreter";
import { cellIndex } from "@/lib/robot-map";

/** A legutóbbi lépés mozgása: meddig csúszik a robot, és melyik mező mikor ásódik ki alatta. */
export type Motion = { id: number; duration: number; cells: number; reveals: { index: number; at: number }[] };

/** Egy mezőnyi csúszás ideje; gyors lejátszásnál a lépés idejébe kell beleférnie. */
const CELL_MS = 200;
/** A mozgás a lépésidő legfeljebb ekkora részét tölti ki, hogy a robot megálljon a következő lépés előtt. */
const MOTION_SHARE_OF_STEP = 0.85;

/** A mező akkor ásódik ki, amikor a robot eleje beér (a mező felénél), nem a lépés indulásakor. */
function motionFor(id: number, before: Snapshot, event: StepEvent | null, cols: number, delay: number): Motion {
  const path = event?.path ?? [];
  if (!path.length) return { id, duration: 0, cells: 0, reveals: [] };
  const duration = Math.min(path.length * CELL_MS, delay * MOTION_SHARE_OF_STEP);
  const reveals = path.flatMap((cell, step) => {
    const index = cellIndex({ cols }, cell.x, cell.y);
    return before.explored[index] ? [] : [{ index, at: (duration * (step + 0.5)) / path.length }];
  });
  return { id, duration, cells: path.length, reveals };
}

/** Egy sor feldolgozása a gépen: az új pillanatkép és a hozzá tartozó mozgásanimáció. */
export function advance(machine: Machine, motionId: number, cols: number, delay: number) {
  const before = machine.snapshot();
  const event = machine.step();
  return { snapshot: machine.snapshot(), motion: motionFor(motionId, before, event, cols, delay) };
}
