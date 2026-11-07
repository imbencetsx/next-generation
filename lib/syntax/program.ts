// A futtatható program alakja: ezt állítja elő a fordító, és ezt hajtja végre az interpreter.

import type { Operator } from "./vocabulary";

/** Egy forráskódbeli hely: sor és oszloptartomány (1-től számozva, a vég kizáró). */
export type Span = { line: number; column: number; endColumn: number };

/** Egyetlen egyszerű érték (simpleval): egész literál, logikai literál vagy változónév. */
export type Operand =
  | { kind: "int"; value: number; column: number; endColumn: number }
  | { kind: "bool"; value: boolean; column: number; endColumn: number }
  | { kind: "var"; name: string; column: number; endColumn: number };

/** A `set` jobb oldala: egy érték, egy egyoperandusú művelet vagy egy kétoperandusú művelet. */
export type Expr =
  | { kind: "value"; operand: Operand }
  | { kind: "not"; operand: Operand }
  | { kind: "isThere"; operand: Operand }
  | { kind: "binary"; left: Operand; op: Operator; right: Operand };

/** A program vége: az ide mutató ugrás befejezi a futást. */
export const END = -1;

/**
 * Lapos utasítás: minden elem pontosan egy feldolgozható programsor.
 * A `next`, `whenTrue` és `whenFalse` mezők a következő utasítás indexét adják, így a végrehajtáshoz
 * nem kell verem, és a lépésszámlálás egyszerűen utasításonként történik.
 */
export type Instruction =
  | { kind: "set"; span: Span; name: string; nameSpan: Span; expr: Expr; next: number }
  | { kind: "step" | "turn" | "print"; span: Span; arg: Operand; next: number }
  | { kind: "mine" | "else"; span: Span; next: number }
  | { kind: "if" | "while"; span: Span; cond: Operand; whenTrue: number; whenFalse: number };

export type Program = {
  readonly instructions: readonly Instruction[];
  /** A forrás sorainak száma (a soronkénti statisztikákhoz). */
  readonly lineCount: number;
};
