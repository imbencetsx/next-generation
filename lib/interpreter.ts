// A MineScript végrehajtása. A gép egy programszámlálóval halad a lapos utasításlistán;
// egy step() hívás pontosan egy feldolgozott programsor (kiírás 3.4).
// A hibák alakja: docs/diagnostics.md.

import {
  cellName, closest, quote, typeWord, withArticle,
  type ErrorCode, type Related, type RunError, type SyntaxIssue, type Value,
} from "./diagnostics";
import { analyzeSource, END, type Expr, type Instruction, type Operand, type Program } from "./syntax";
import { DIRECTIONS, type Direction, type GameMap } from "./robot-map";

export type { Diagnostic, ErrorCode, RunError, SyntaxCode, SyntaxIssue, Value } from "./diagnostics";
export type { Program } from "./syntax";

export const MAX_LINES = 1000;

export type ParseResult = { ok: true; program: Program } | { ok: false; issues: SyntaxIssue[] };

export function parseProgram(source: string): ParseResult {
  const { issues, program } = analyzeSource(source);
  return program ? { ok: true, program } : { ok: false, issues };
}

export type Cell = { x: number; y: number };

/** Mi történt egy lépésben; a felület ebből animálhat mezőnként. */
export type StepEvent = {
  line: number;
  kind: Instruction["kind"];
  /** A lépés során a robot által sorban érintett mezők (hiba esetén csak a ténylegesen megtettek). */
  path: Cell[];
  printed?: string;
};

export type Snapshot = {
  status: "idle" | "running" | "done" | "error";
  /** A legutóbb feldolgozott forrássor száma. */
  line: number | null;
  /** A következő step() által feldolgozandó sor; null, ha a gép nem fut. */
  nextLine: number | null;
  robot: GameMap["robot"];
  explored: boolean[];
  gold: boolean[];
  mined: number;
  steps: number;
  output: string[];
  variables: [string, Value][];
  error: RunError | null;
};

type At = { column: number; endColumn: number };

class RunFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly at: At,
    message: string,
    readonly hint?: string,
    readonly related?: Related[],
  ) {
    super(message);
  }
}

const EDGE_NAMES = ["top", "left", "bottom", "right"] as const;

/** Egy operandus leírása a hibaüzenetekhez: változónál a neve és értéke, literálnál maga az érték. */
function describe(op: Operand, value: Value): string {
  return op.kind === "var" ? `${quote(op.name)} is ${withArticle(value)} (${value})` : `${value} is ${withArticle(value)}`;
}

export class Machine {
  private readonly code: readonly Instruction[];
  private pc: number;
  private readonly vars = new Map<string, { value: Value; typedAt: number }>();
  private readonly gold: boolean[];
  private readonly explored: boolean[];
  private readonly robot: GameMap["robot"];
  private readonly minedAt = new Map<number, number>();
  private readonly hits: Uint32Array;
  private mined = 0;
  private steps = 0;
  private line: number | null = null;
  private readonly output: string[] = [];
  private error: RunError | null = null;
  status: "running" | "done" | "error";

  constructor(program: Program, private readonly map: GameMap) {
    this.code = program.instructions;
    this.pc = this.code.length ? 0 : END;
    this.status = this.pc === END ? "done" : "running";
    this.hits = new Uint32Array(program.lineCount + 1);
    this.gold = [...map.gold];
    this.robot = { ...map.robot };
    this.explored = map.walls.map(() => false);
    this.explored[this.index(this.robot.x, this.robot.y)] = true;
  }

  step(): StepEvent | null {
    if (this.status !== "running") return null;
    const ins = this.code[this.pc];
    const line = ins.span.line;
    const event: StepEvent = { line, kind: ins.kind, path: [] };
    this.line = line;
    try {
      // Az 1000. sor után a következő sor már nem dolgozható fel.
      if (this.steps >= MAX_LINES) throw this.limitFailure(ins);
      this.steps++;
      this.hits[line]++;
      this.pc = this.execute(ins, event);
      if (this.pc === END) this.status = "done";
    } catch (failure) {
      if (!(failure instanceof RunFailure)) throw failure;
      this.error = {
        code: failure.code,
        line,
        column: failure.at.column,
        endColumn: failure.at.endColumn,
        message: failure.message,
        ...(failure.hint ? { hint: failure.hint } : {}),
        ...(failure.related?.length ? { related: failure.related } : {}),
      };
      this.status = "error";
    }
    return event;
  }

  snapshot(): Snapshot {
    return {
      status: this.status,
      line: this.line,
      nextLine: this.status === "running" ? this.code[this.pc].span.line : null,
      robot: { ...this.robot },
      explored: [...this.explored],
      gold: [...this.gold],
      mined: this.mined,
      steps: this.steps,
      output: [...this.output],
      variables: [...this.vars].map(([name, entry]) => [name, entry.value]),
      error: this.error && { ...this.error, related: this.error.related?.map((item) => ({ ...item })) },
    };
  }

  private index = (x: number, y: number) => y * this.map.cols + x;
  private inside = (x: number, y: number) => x >= 0 && y >= 0 && x < this.map.cols && y < this.map.rows;

  /** Végrehajt egy utasítást, és visszaadja a következő utasítás indexét. */
  private execute(ins: Instruction, event: StepEvent): number {
    switch (ins.kind) {
      case "set": {
        const value = this.evaluate(ins.expr);
        const previous = this.vars.get(ins.name);
        if (previous && typeof previous.value !== typeof value) {
          throw new RunFailure("E_TYPE_MISMATCH", ins.nameSpan,
            `${quote(ins.name)} is ${withArticle(previous.value)} (currently ${previous.value}) and cannot be assigned ${withArticle(value)} (${value}).`,
            `A variable keeps the type of its first assignment. Store the ${typeWord(value)} in a new variable, e.g. set ${ins.name}${typeof value === "boolean" ? "Flag" : "Count"} to …`,
            [{ line: previous.typedAt, message: `${quote(ins.name)} became ${withArticle(previous.value)} here` }]);
        }
        this.vars.set(ins.name, { value, typedAt: previous?.typedAt ?? ins.span.line });
        return ins.next;
      }
      case "print": {
        const text = String(this.read(ins.arg));
        this.output.push(text);
        event.printed = text;
        return ins.next;
      }
      case "step":
        this.move(this.argument(ins.arg, "step forward"), ins, event);
        return ins.next;
      case "turn":
        this.robot.dir = ((this.robot.dir + this.argument(ins.arg, "turn by")) % 4) as Direction;
        return ins.next;
      case "mine": {
        const { x, y } = this.robot;
        const at = this.index(x, y);
        if (!this.gold[at]) {
          const earlier = this.minedAt.get(at);
          throw new RunFailure("E_NO_GOLD", ins.span,
            earlier
              ? `There is no gold left at ${cellName(x, y)} (the robot's cell): it was already mined on line ${earlier}.`
              : `There is no gold at ${cellName(x, y)} (the robot's cell).`,
            "mine here only works on a gold cell. Check the cell ahead with set gold to isThere 2, step onto it, then mine here.",
            earlier ? [{ line: earlier, message: "this gold was mined here" }] : undefined);
        }
        this.gold[at] = false;
        this.minedAt.set(at, ins.span.line);
        this.mined++;
        return ins.next;
      }
      case "else":
        return ins.next; // Az else sora csak akkor fut le (és számít), ha az else ág következik.
      case "if":
      case "while":
        return this.condition(ins.cond, ins.kind) ? ins.whenTrue : ins.whenFalse;
    }
  }

  // Mezőnként halad, így falnál a már megtett mezők megmaradnak (D3).
  private move(count: number, ins: Instruction, event: StepEvent) {
    const { dx, dy } = DIRECTIONS[this.robot.dir];
    const heading = DIRECTIONS[this.robot.dir].name;
    for (let moved = 0; moved < count; moved++) {
      const x = this.robot.x + dx;
      const y = this.robot.y + dy;
      const inside = this.inside(x, y);
      if (!inside || this.map.walls[this.index(x, y)]) {
        const where = inside ? `hit a wall at ${cellName(x, y)}` : `would leave the map over its ${EDGE_NAMES[this.robot.dir]} edge`;
        throw new RunFailure("E_BEDROCK_HIT", ins.span,
          `The robot ${where} after moving ${moved} of ${count} cell${count === 1 ? "" : "s"} ${heading}. It stopped at ${cellName(this.robot.x, this.robot.y)}.`,
          "Check the cell ahead before moving: set wall to isThere 1");
      }
      this.robot.x = x;
      this.robot.y = y;
      this.explored[this.index(x, y)] = true;
      event.path.push({ x, y });
    }
  }

  private read(op: Operand): Value {
    if (op.kind !== "var") return op.value;
    const entry = this.vars.get(op.name);
    if (entry) return entry.value;
    const names = [...this.vars.keys()];
    const sameLetters = names.find((name) => name.toLowerCase() === op.name.toLowerCase());
    const near = sameLetters ?? (op.name.length >= 3 ? closest(op.name, names) : null);
    throw new RunFailure("E_UNINITIALIZED", op,
      `Variable ${quote(op.name)} is read before it has been given a value.`,
      sameLetters
        ? `Did you mean ${quote(sameLetters)}? Variable names are case-sensitive.`
        : near
          ? `Did you mean ${quote(near)}? Otherwise assign it first: set ${op.name} to …`
          : `Assign it first, e.g. set ${op.name} to 0${names.length ? `. Defined so far: ${names.join(", ")}` : ""}.`);
  }

  private condition(op: Operand, keyword: "if" | "while"): boolean {
    const value = this.read(op);
    if (typeof value === "boolean") return value;
    throw new RunFailure("E_NON_BOOL_CONDITION", op,
      `The condition of ${keyword} must be a boolean, but ${describe(op, value)}.`,
      op.kind === "var"
        ? `MineScript has no truthiness. Compare explicitly:\nset ok to ${op.name} <> 0\n${keyword} ok`
        : "Use true or false, or a boolean variable computed with set (e.g. set ok to n <> 0).");
  }

  private argument(op: Operand, name: "step forward" | "turn by"): number {
    const value = this.read(op);
    if (typeof value === "number" && value >= 0) return value;
    throw new RunFailure("E_BAD_ARG", op,
      `${name} needs a non-negative integer, but ${typeof value === "number" ? (op.kind === "var" ? `${quote(op.name)} is ${value}` : `got ${value}`) : describe(op, value)}.`,
      typeof value === "number"
        ? name === "step forward" ? "The robot cannot move backwards: turn by 2 first, then step forward." : "Turning is always to the left: turn by 3 is a quarter turn to the right."
        : undefined);
  }

  // A kiértékelés balról jobbra halad, és minden operandust azonnal ellenőriz; rövidzár nincs.
  private evaluate(expr: Expr): Value {
    switch (expr.kind) {
      case "value":
        return this.read(expr.a);
      case "not": {
        const value = this.read(expr.a);
        if (typeof value !== "boolean") {
          throw new RunFailure("E_BAD_OPERAND", expr.a, `not needs a boolean, but ${describe(expr.a, value)}.`);
        }
        return !value;
      }
      case "isThere": {
        const kind = this.read(expr.a);
        if (typeof kind !== "number" || (kind !== 0 && kind !== 1 && kind !== 2)) {
          throw new RunFailure("E_BAD_ARG", expr.a,
            `isThere expects 0 (empty), 1 (wall) or 2 (gold), but ${typeof kind === "number" ? (expr.a.kind === "var" ? `${quote(expr.a.name)} is ${kind}` : `got ${kind}`) : describe(expr.a, kind)}.`);
        }
        return this.look(kind);
      }
      case "binary": {
        const { op } = expr;
        const equality = op === "=" || op === "<>";
        const wanted = op === "and" || op === "or" ? "boolean" : "number";
        const left = this.read(expr.a);
        if (!equality && typeof left !== wanted) {
          throw new RunFailure("E_BAD_OPERAND", expr.a,
            `The left side of ${quote(op)} must be ${wanted === "number" ? "an integer" : "a boolean"}, but ${describe(expr.a, left)}.`);
        }
        const right = this.read(expr.b);
        if (equality ? typeof right !== typeof left : typeof right !== wanted) {
          throw new RunFailure("E_BAD_OPERAND", expr.b,
            equality
              ? `Both sides of ${quote(op)} must have the same type, but the left side is ${withArticle(left)} (${left}) and the right side is ${withArticle(right)} (${right}).`
              : `The right side of ${quote(op)} must be ${wanted === "number" ? "an integer" : "a boolean"}, but ${describe(expr.b, right)}.`,
            equality ? "Compare integers with integers and booleans with booleans." : undefined);
        }
        switch (op) {
          case "+": return (left as number) + (right as number);
          case "-": return (left as number) - (right as number);
          case "*": return (left as number) * (right as number);
          case "<": return (left as number) < (right as number);
          case "<=": return (left as number) <= (right as number);
          case ">": return (left as number) > (right as number);
          case ">=": return (left as number) >= (right as number);
          case "=": return left === right;
          case "<>": return left !== right;
          case "and": return (left as boolean) && (right as boolean);
          case "or": return (left as boolean) || (right as boolean);
        }
      }
    }
  }

  // A térképen kívüli mező falnak számít, de nem kerül a felfedezett mezők közé (D7).
  private look(kind: 0 | 1 | 2): boolean {
    const { dx, dy } = DIRECTIONS[this.robot.dir];
    const x = this.robot.x + dx;
    const y = this.robot.y + dy;
    if (!this.inside(x, y)) return kind === 1;
    const at = this.index(x, y);
    this.explored[at] = true;
    const found = this.map.walls[at] ? 1 : this.gold[at] ? 2 : 0;
    return found === kind;
  }

  private limitFailure(ins: Instruction): RunFailure {
    let hottest: Instruction | null = null;
    for (const candidate of this.code) {
      if (candidate.kind === "while" && this.hits[candidate.span.line] > (hottest ? this.hits[hottest.span.line] : 0)) hottest = candidate;
    }
    const checks = hottest ? this.hits[hottest.span.line] : 0;
    return new RunFailure("INSTRUCTION_COUNT_LIMIT_EXCEEDED", ins.span,
      `The program reached the limit of ${MAX_LINES} processed lines; line ${ins.span.line} would be the ${MAX_LINES + 1}st.`,
      hottest
        ? `This usually means an endless loop: the while on line ${hottest.span.line} was checked ${checks} times. Make sure its condition eventually becomes false.`
        : `The program needs more than ${MAX_LINES} processed lines. Use fewer instructions.`,
      hottest ? [{ line: hottest.span.line, message: `while checked ${checks} times` }] : undefined);
  }
}

export function idleSnapshot(map: GameMap): Snapshot {
  const explored = map.walls.map(() => false);
  explored[map.robot.y * map.cols + map.robot.x] = true;
  return {
    status: "idle",
    line: null,
    nextLine: null,
    robot: { ...map.robot },
    explored,
    gold: [...map.gold],
    mined: 0,
    steps: 0,
    output: [],
    variables: [],
    error: null,
  };
}
