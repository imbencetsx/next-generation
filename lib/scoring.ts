// Egy futás eredménye a ranglistához (kiírás 3.5): a kibányászott arany és a feldolgozott sorok száma.
// Előrébb az áll, aki több aranyat szedett össze; azonos aranynál az, akinek kevesebb lépés kellett.
// A szerver is ezzel számol: a programot újra lefuttatja a tárolt térképen, nem a kliens számait fogadja el.

import { Machine, parseProgram, type ErrorCode, type SyntaxIssue } from "./interpreter";
import { MAX_LINES } from "./limits";
import type { GameMap } from "./robot-map";

/** Egy futás pontszáma. */
export type Score = { gold: number; steps: number };

/** Egy végigfuttatott program eredménye: a pontszám, és ha hibával állt meg, a hibakód. */
export type ScoredRun = Score & { errorCode: ErrorCode | null };

/** Jobb-e `a` a `b`-nél: több arany, vagy ugyanannyi arany kevesebb lépésből. Egyenlőség nem jobb. */
export function isBetterScore(a: Score, b: Score): boolean {
  return a.gold > b.gold || (a.gold === b.gold && a.steps < b.steps);
}

/**
 * A ranglista rendezési kulcsa egyetlen számban, csökkenő sorrendhez: előbb az arany, azon belül a kevesebb
 * lépés. A lépésszám legfeljebb MAX_LINES, ezért az arany (MAX_LINES + 1)-szerese mindig többet nyom a latban.
 */
export function scoreRank({ gold, steps }: Score): number {
  return gold * (MAX_LINES + 1) + (MAX_LINES - steps);
}

/**
 * A program végigfuttatása a térképen, ahogy a felület is futtatná: a program végéig, az első futásidejű
 * hibáig vagy a sorkorlátig. Szintaktikailag hibás program nem futtatható; ilyenkor a hibák listája jön vissza.
 */
export function scoreProgram(
  source: string,
  map: GameMap,
): { ok: true; run: ScoredRun } | { ok: false; issues: SyntaxIssue[] } {
  const parsed = parseProgram(source);
  if (!parsed.ok) return { ok: false, issues: parsed.issues };

  const machine = new Machine(parsed.program, map);
  // A gép legfeljebb MAX_LINES + 1 lépésben megáll (az utolsó a korláthiba); ez csak biztosíték.
  for (let calls = 0; machine.status === "running" && calls <= MAX_LINES + 1; calls++) machine.step();
  const { mined, steps, error } = machine.snapshot();
  return { ok: true, run: { gold: mined, steps, errorCode: error?.code ?? null } };
}
