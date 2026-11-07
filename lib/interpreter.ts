// A MineScript végrehajtása. A gép (Machine) egy programszámlálóval halad a lapos utasításlistán;
// egy step() hívás pontosan egy feldolgozott programsor (kiírás 3.4), ezért a lépésszám itt dől el,
// nem a felületen. A felület csak a pillanatképeket (Snapshot) jeleníti meg.
// A hibák alakja: docs/diagnostics.md.

import {
  cellName,
  plural,
  quote,
  typeWord,
  withArticle,
  type ErrorCode,
  type Related,
  type RunError,
  type SyntaxIssue,
  type Value,
} from "./diagnostics";
import { MAX_LINES } from "./limits";
import { closest } from "./suggest";
import { analyzeSource, END, type Expr, type Instruction, type Operand, type Program } from "./syntax";
import { cellIndex, DIRECTIONS, type Direction, type GameMap } from "./robot-map";

export type { Diagnostic, ErrorCode, RunError, SyntaxCode, SyntaxIssue, Value } from "./diagnostics";
export type { Program } from "./syntax";
export { MAX_LINES } from "./limits";

/** Az `isThere` argumentuma: mit keresünk a robot előtti mezőn. */
export const CELL_KIND = { empty: 0, wall: 1, gold: 2 } as const;
type CellKind = (typeof CELL_KIND)[keyof typeof CELL_KIND];
const isCellKind = (value: Value): value is CellKind => value === 0 || value === 1 || value === 2;

export type ParseResult = { ok: true; program: Program } | { ok: false; issues: SyntaxIssue[] };

/** Futtatható program a forrásból, vagy az összes szintaktikai hiba. */
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

/** A futás teljes, a géptől független másolata egy adott pillanatban. */
export type Snapshot = {
  status: "idle" | "running" | "done" | "error";
  /** A legutóbb feldolgozott forrássor száma. */
  line: number | null;
  /** A következő step() által feldolgozandó sor; null, ha a gép nem fut. */
  nextLine: number | null;
  robot: GameMap["robot"];
  /** Mezőnként (sorfolytonosan): látta-e már a robot (D7). */
  explored: boolean[];
  /** Mezőnként: van-e még ott arany. */
  gold: boolean[];
  mined: number;
  /** A feldolgozott programsorok száma (a ranglista lépésszáma). */
  steps: number;
  output: string[];
  variables: [string, Value][];
  error: RunError | null;
};

type ColumnRange = { column: number; endColumn: number };

/** Futásidejű hiba a gépen belül; a step() alakítja át a nyilvános RunError formára. */
class RunFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly at: ColumnRange,
    message: string,
    readonly hint?: string,
    readonly related?: Related[],
  ) {
    super(message);
  }
}

/** A térkép széleinek neve irányonként (a DIRECTIONS sorrendjében: észak, nyugat, dél, kelet). */
const EDGE_NAMES = ["top", "left", "bottom", "right"] as const;

/** Egy operandus leírása a hibaüzenetekhez: változónál a neve és értéke, literálnál maga az érték. */
function describe(op: Operand, value: Value): string {
  return op.kind === "var"
    ? `${quote(op.name)} is ${withArticle(value)} (${value})`
    : `${value} is ${withArticle(value)}`;
}

/** Rossz számértéknél a konkrét értéket mutatjuk, rossz típusnál a típust is. */
function describeNumberArgument(op: Operand, value: Value): string {
  if (typeof value !== "number") return describe(op, value);
  return op.kind === "var" ? `${quote(op.name)} is ${value}` : `got ${value}`;
}

const typeName = (wanted: "number" | "boolean") => (wanted === "number" ? "an integer" : "a boolean");

export class Machine {
  status: "running" | "done" | "error";

  private readonly code: readonly Instruction[];
  /** A következő utasítás indexe a `code`-ban; END, ha a program véget ért. */
  private pc: number;
  /** A változók értéke és az a sor, ahol a típusuk rögzült (a hibaüzenethez). */
  private readonly vars = new Map<string, { value: Value; typedAt: number }>();
  private readonly robot: GameMap["robot"];
  private readonly gold: boolean[];
  private readonly explored: boolean[];
  /** Mezőindex → a sor, ahol kibányásztuk (a „már kibányászva” hibaüzenethez). */
  private readonly minedAt = new Map<number, number>();
  /** Soronként a feldolgozások száma; a végtelen ciklus felismeréséhez. */
  private readonly lineHits: Uint32Array;
  private mined = 0;
  private steps = 0;
  private line: number | null = null;
  private readonly output: string[] = [];
  private error: RunError | null = null;

  constructor(
    program: Program,
    private readonly map: GameMap,
  ) {
    this.code = program.instructions;
    this.pc = this.code.length ? 0 : END;
    this.status = this.pc === END ? "done" : "running";
    this.lineHits = new Uint32Array(program.lineCount + 1);
    this.gold = [...map.gold];
    this.robot = { ...map.robot };
    this.explored = map.walls.map(() => false);
    this.explored[this.index(this.robot.x, this.robot.y)] = true;
  }

  /** Egy programsor feldolgozása. Ha a gép már nem fut, null. */
  step(): StepEvent | null {
    if (this.status !== "running") return null;
    const instruction = this.code[this.pc];
    const line = instruction.span.line;
    const event: StepEvent = { line, kind: instruction.kind, path: [] };
    this.line = line;
    try {
      // Az 1000. sor után a következő sor már nem dolgozható fel.
      if (this.steps >= MAX_LINES) throw this.limitFailure(instruction);
      this.steps++;
      this.lineHits[line]++;
      this.pc = this.execute(instruction, event);
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

  private index = (x: number, y: number) => cellIndex(this.map, x, y);
  private inside = (x: number, y: number) => x >= 0 && y >= 0 && x < this.map.cols && y < this.map.rows;

  /** Végrehajt egy utasítást, és visszaadja a következő utasítás indexét. */
  private execute(instruction: Instruction, event: StepEvent): number {
    switch (instruction.kind) {
      case "set":
        this.assign(instruction.name, this.evaluate(instruction.expr), instruction);
        return instruction.next;
      case "print": {
        const text = String(this.read(instruction.arg));
        this.output.push(text);
        event.printed = text;
        return instruction.next;
      }
      case "step":
        this.move(this.argument(instruction.arg, "step forward"), instruction, event);
        return instruction.next;
      case "turn":
        // Az irány növelése balra fordulás (lásd DIRECTIONS).
        this.robot.dir = ((this.robot.dir + this.argument(instruction.arg, "turn by")) % 4) as Direction;
        return instruction.next;
      case "mine":
        this.mine(instruction);
        return instruction.next;
      case "else":
        return instruction.next; // Az else sora csak akkor fut le (és számít), ha az else ág következik.
      case "if":
      case "while":
        return this.condition(instruction.cond, instruction.kind) ? instruction.whenTrue : instruction.whenFalse;
    }
  }

  /** Értékadás; az első értékadás rögzíti a változó típusát. */
  private assign(name: string, value: Value, instruction: Extract<Instruction, { kind: "set" }>) {
    const previous = this.vars.get(name);
    if (previous && typeof previous.value !== typeof value) {
      const suggestion = `${name}${typeof value === "boolean" ? "Flag" : "Count"}`;
      throw new RunFailure(
        "E_TYPE_MISMATCH",
        instruction.nameSpan,
        `${quote(name)} is ${withArticle(previous.value)} (currently ${previous.value}) and cannot be assigned ${withArticle(value)} (${value}).`,
        `A variable keeps the type of its first assignment. Store the ${typeWord(value)} in a new variable, e.g. set ${suggestion} to …`,
        [{ line: previous.typedAt, message: `${quote(name)} became ${withArticle(previous.value)} here` }],
      );
    }
    this.vars.set(name, { value, typedAt: previous?.typedAt ?? instruction.span.line });
  }

  private mine(instruction: Instruction) {
    const { x, y } = this.robot;
    const at = this.index(x, y);
    if (!this.gold[at]) {
      const minedOnLine = this.minedAt.get(at);
      throw new RunFailure(
        "E_NO_GOLD",
        instruction.span,
        minedOnLine
          ? `There is no gold left at ${cellName(x, y)} (the robot's cell): it was already mined on line ${minedOnLine}.`
          : `There is no gold at ${cellName(x, y)} (the robot's cell).`,
        "mine here only works on a gold cell. Check the cell ahead with set gold to isThere 2, step onto it, then mine here.",
        minedOnLine ? [{ line: minedOnLine, message: "this gold was mined here" }] : undefined,
      );
    }
    this.gold[at] = false;
    this.minedAt.set(at, instruction.span.line);
    this.mined++;
  }

  /** Mezőnként halad, így falnál a már megtett mezők megmaradnak (D3). */
  private move(count: number, instruction: Instruction, event: StepEvent) {
    const { dx, dy, name: heading } = DIRECTIONS[this.robot.dir];
    for (let moved = 0; moved < count; moved++) {
      const x = this.robot.x + dx;
      const y = this.robot.y + dy;
      const inside = this.inside(x, y);
      if (!inside || this.map.walls[this.index(x, y)]) {
        const where = inside
          ? `hit a wall at ${cellName(x, y)}`
          : `would leave the map over its ${EDGE_NAMES[this.robot.dir]} edge`;
        throw new RunFailure(
          "E_BEDROCK_HIT",
          instruction.span,
          `The robot ${where} after moving ${moved} of ${plural(count, "cell")} ${heading}. It stopped at ${cellName(this.robot.x, this.robot.y)}.`,
          "Check the cell ahead before moving: set wall to isThere 1",
        );
      }
      this.robot.x = x;
      this.robot.y = y;
      this.explored[this.index(x, y)] = true;
      event.path.push({ x, y });
    }
  }

  /** Egy operandus értéke; még nem kapott értéket változónál E_UNINITIALIZED, elírásnál javaslattal. */
  private read(op: Operand): Value {
    if (op.kind !== "var") return op.value;
    const entry = this.vars.get(op.name);
    if (entry) return entry.value;

    const names = [...this.vars.keys()];
    const sameLetters = names.find((name) => name.toLowerCase() === op.name.toLowerCase());
    const near = sameLetters ?? (op.name.length >= 3 ? closest(op.name, names) : null);
    let hint = `Assign it first, e.g. set ${op.name} to 0${names.length ? `. Defined so far: ${names.join(", ")}` : ""}.`;
    if (sameLetters) hint = `Did you mean ${quote(sameLetters)}? Variable names are case-sensitive.`;
    else if (near) hint = `Did you mean ${quote(near)}? Otherwise assign it first: set ${op.name} to …`;
    throw new RunFailure(
      "E_UNINITIALIZED",
      op,
      `Variable ${quote(op.name)} is read before it has been given a value.`,
      hint,
    );
  }

  private condition(op: Operand, keyword: "if" | "while"): boolean {
    const value = this.read(op);
    if (typeof value === "boolean") return value;
    throw new RunFailure(
      "E_NON_BOOL_CONDITION",
      op,
      `The condition of ${keyword} must be a boolean, but ${describe(op, value)}.`,
      op.kind === "var"
        ? `MineScript has no truthiness. Compare explicitly:\nset ok to ${op.name} <> 0\n${keyword} ok`
        : "Use true or false, or a boolean variable computed with set (e.g. set ok to n <> 0).",
    );
  }

  /** A `step forward` és a `turn by` argumentuma: nemnegatív egész. */
  private argument(op: Operand, name: "step forward" | "turn by"): number {
    const value = this.read(op);
    if (typeof value === "number" && value >= 0) return value;

    let hint: string | undefined;
    if (typeof value === "number") {
      hint =
        name === "step forward"
          ? "The robot cannot move backwards: turn by 2 first, then step forward."
          : "Turning is always to the left: turn by 3 is a quarter turn to the right.";
    }
    throw new RunFailure(
      "E_BAD_ARG",
      op,
      `${name} needs a non-negative integer, but ${describeNumberArgument(op, value)}.`,
      hint,
    );
  }

  /** A kiértékelés balról jobbra halad, és minden operandust azonnal ellenőriz; rövidzár nincs (kiírás 2.2). */
  private evaluate(expr: Expr): Value {
    switch (expr.kind) {
      case "value":
        return this.read(expr.operand);
      case "not": {
        const value = this.read(expr.operand);
        if (typeof value !== "boolean") {
          throw new RunFailure(
            "E_BAD_OPERAND",
            expr.operand,
            `not needs a boolean, but ${describe(expr.operand, value)}.`,
          );
        }
        return !value;
      }
      case "isThere":
        return this.look(this.cellKindArgument(expr.operand));
      case "binary":
        return this.evaluateBinary(expr);
    }
  }

  private evaluateBinary({ left: leftOperand, op, right: rightOperand }: Extract<Expr, { kind: "binary" }>): Value {
    if (op === "=" || op === "<>") {
      // Az egyenlőség mindkét oldalt beolvassa, mielőtt összevetné a típusokat.
      const left = this.read(leftOperand);
      const right = this.read(rightOperand);
      if (typeof right !== typeof left) {
        throw new RunFailure(
          "E_BAD_OPERAND",
          rightOperand,
          `Both sides of ${quote(op)} must have the same type, but the left side is ${withArticle(left)} (${left}) and the right side is ${withArticle(right)} (${right}).`,
          "Compare integers with integers and booleans with booleans.",
        );
      }
      return op === "=" ? left === right : left !== right;
    }

    if (op === "and" || op === "or") {
      const left = this.binaryOperand(leftOperand, op, "left", "boolean");
      // Nincs rövidzár: a jobb oldalt a bal értékétől függetlenül beolvassuk és ellenőrizzük.
      const right = this.binaryOperand(rightOperand, op, "right", "boolean");
      return op === "and" ? left && right : left || right;
    }

    const left = this.binaryOperand(leftOperand, op, "left", "number");
    const right = this.binaryOperand(rightOperand, op, "right", "number");
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
    }
  }

  /** A beolvasás után azonnal ellenőrzi a típust; a hiba ezért mindig a legelső hibás operandusé. */
  private binaryOperand(operand: Operand, op: string, side: "left" | "right", wanted: "boolean"): boolean;
  private binaryOperand(operand: Operand, op: string, side: "left" | "right", wanted: "number"): number;
  private binaryOperand(operand: Operand, op: string, side: "left" | "right", wanted: "boolean" | "number"): Value {
    const value = this.read(operand);
    if (typeof value !== wanted) {
      throw new RunFailure(
        "E_BAD_OPERAND",
        operand,
        `The ${side} side of ${quote(op)} must be ${typeName(wanted)}, but ${describe(operand, value)}.`,
      );
    }
    return value;
  }

  /** Az `isThere` argumentuma: 0, 1 vagy 2 (CELL_KIND); minden más E_BAD_ARG. */
  private cellKindArgument(op: Operand): CellKind {
    const kind = this.read(op);
    if (isCellKind(kind)) return kind;
    throw new RunFailure(
      "E_BAD_ARG",
      op,
      `isThere expects 0 (empty), 1 (wall) or 2 (gold), but ${describeNumberArgument(op, kind)}.`,
    );
  }

  /** `isThere`: a robot előtti mező vizsgálata. A térképen kívüli mező falnak számít, de nem lesz felfedezett (D7). */
  private look(kind: CellKind): boolean {
    const { dx, dy } = DIRECTIONS[this.robot.dir];
    const x = this.robot.x + dx;
    const y = this.robot.y + dy;
    if (!this.inside(x, y)) return kind === CELL_KIND.wall;

    const at = this.index(x, y);
    this.explored[at] = true;
    // Aranyas mező nem „üres” (D4).
    const found = this.map.walls[at] ? CELL_KIND.wall : this.gold[at] ? CELL_KIND.gold : CELL_KIND.empty;
    return found === kind;
  }

  /** A sorkorlát hibája; ha egy ciklus a ludas, azt is megmutatja. */
  private limitFailure(instruction: Instruction): RunFailure {
    const hitsOf = (candidate: Instruction) => this.lineHits[candidate.span.line];
    let busiestLoop: Instruction | null = null;
    for (const candidate of this.code) {
      if (candidate.kind === "while" && hitsOf(candidate) > (busiestLoop ? hitsOf(busiestLoop) : 0)) {
        busiestLoop = candidate;
      }
    }

    const line = instruction.span.line;
    const message = `The program reached the limit of ${MAX_LINES} processed lines; line ${line} would be the ${MAX_LINES + 1}st.`;
    if (!busiestLoop) {
      return new RunFailure(
        "INSTRUCTION_COUNT_LIMIT_EXCEEDED",
        instruction.span,
        message,
        `The program needs more than ${MAX_LINES} processed lines. Use fewer instructions.`,
      );
    }
    const loopLine = busiestLoop.span.line;
    const checks = hitsOf(busiestLoop);
    return new RunFailure(
      "INSTRUCTION_COUNT_LIMIT_EXCEEDED",
      instruction.span,
      message,
      `This usually means an endless loop: the while on line ${loopLine} was checked ${checks} times. Make sure its condition eventually becomes false.`,
      [{ line: loopLine, message: `while checked ${checks} times` }],
    );
  }
}

/** A futás előtti állapot: a robot a kezdőmezőn, csak az a mező felfedezett. */
export function idleSnapshot(map: GameMap): Snapshot {
  const explored = map.walls.map(() => false);
  explored[cellIndex(map, map.robot.x, map.robot.y)] = true;
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
