import { validateMineScript, type SyntaxIssue } from "./minescript";
import { DIRECTIONS, type Direction, type GameMap } from "./robot-map";

export const MAX_LINES = 1000;

export type Value = number | boolean;
export type ErrorCode =
  | "E_TYPE_MISMATCH"
  | "E_UNINITIALIZED"
  | "E_NON_BOOL_CONDITION"
  | "E_BAD_OPERAND"
  | "E_BEDROCK_HIT"
  | "E_NO_GOLD"
  | "E_BAD_ARG"
  | "INSTRUCTION_COUNT_LIMIT_EXCEEDED";
export type RunError = { code: ErrorCode; line: number; message: string };

// ---------------------------------------------------------------- parsing

type Operand = { kind: "int"; value: number } | { kind: "bool"; value: boolean } | { kind: "var"; name: string };
type Expr =
  | { kind: "value"; a: Operand }
  | { kind: "not"; a: Operand }
  | { kind: "isThere"; a: Operand }
  | { kind: "binary"; a: Operand; op: string; b: Operand };
type Stmt =
  | { kind: "set"; line: number; name: string; expr: Expr }
  | { kind: "step" | "turn" | "print"; line: number; arg: Operand }
  | { kind: "mine" | "else"; line: number }
  | { kind: "if"; line: number; cond: Operand; then: Stmt[]; else?: Stmt[]; elseLine?: number }
  | { kind: "while"; line: number; cond: Operand; body: Stmt[] };

export type ParseResult = { ok: true; program: Stmt[] } | { ok: false; issues: SyntaxIssue[] };

const operand = (token: string): Operand =>
  /^\d+$/.test(token) ? { kind: "int", value: Number(token) }
  : token === "true" || token === "false" ? { kind: "bool", value: token === "true" }
  : { kind: "var", name: token };

function expression(tokens: string[]): Expr {
  if (tokens.length === 1) return { kind: "value", a: operand(tokens[0]) };
  if (tokens.length === 2) return { kind: tokens[0] as "not" | "isThere", a: operand(tokens[1]) };
  return { kind: "binary", a: operand(tokens[0]), op: tokens[1], b: operand(tokens[2]) };
}

/** Validates the syntax, then builds a statement tree that remembers source line numbers. */
export function parseProgram(source: string): ParseResult {
  const issues = validateMineScript(source);
  if (issues.length) return { ok: false, issues };

  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();

  const program: Stmt[] = [];
  const blocks = [{ indent: 0, body: program }];
  let nextBlock: Stmt[] | null = null; // body that a deeper-indented line would belong to

  lines.forEach((text, index) => {
    const line = index + 1;
    const indent = text.match(/^ */)![0].length;
    if (indent > blocks.at(-1)!.indent && nextBlock) blocks.push({ indent, body: nextBlock });
    else while (blocks.length > 1 && indent < blocks.at(-1)!.indent) blocks.pop();
    const body = blocks.at(-1)!.body;
    const tokens = text.slice(indent).split(" ");
    nextBlock = null;

    switch (tokens[0]) {
      case "set": body.push({ kind: "set", line, name: tokens[1], expr: expression(tokens.slice(3)) }); break;
      case "step": case "turn": case "print":
        body.push({ kind: tokens[0], line, arg: operand(tokens.at(-1)!) }); break;
      case "mine": body.push({ kind: "mine", line }); break;
      case "if": {
        const node: Stmt = { kind: "if", line, cond: operand(tokens[1]), then: [] };
        body.push(node);
        nextBlock = node.then;
        break;
      }
      case "else": {
        const previous = body.at(-1);
        if (previous?.kind === "if") {
          previous.else = [];
          previous.elseLine = line;
          nextBlock = previous.else;
        }
        break;
      }
      case "while": {
        const node: Stmt = { kind: "while", line, cond: operand(tokens[1]), body: [] };
        body.push(node);
        nextBlock = node.body;
        break;
      }
    }
  });
  return { ok: true, program };
}

// -------------------------------------------------------------- execution

class RunFailure extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); }
}
const typeName = (value: Value) => (typeof value === "number" ? "an integer" : "a boolean");

export type Snapshot = {
  status: "idle" | "running" | "done" | "error";
  /** Source line processed by the most recent step. */
  line: number | null;
  robot: GameMap["robot"];
  explored: boolean[];
  gold: boolean[];
  mined: number;
  steps: number;
  output: string[];
  variables: [string, Value][];
  error: RunError | null;
};

type Frame = { body: Stmt[]; i: number };

export class Machine {
  private frames: Frame[];
  private vars = new Map<string, Value>();
  private gold: boolean[];
  private explored: boolean[];
  private robot: GameMap["robot"];
  private mined = 0;
  private steps = 0;
  private line: number | null = null;
  private output: string[] = [];
  private error: RunError | null = null;
  status: "running" | "done" | "error" = "running";

  constructor(program: Stmt[], private readonly map: GameMap) {
    this.frames = [{ body: program, i: 0 }];
    this.gold = [...map.gold];
    this.robot = { ...map.robot };
    this.explored = map.walls.map(() => false);
    this.explored[this.index(this.robot.x, this.robot.y)] = true;
    this.settle();
  }

  /** Executes exactly one program line (one unit of the leaderboard "step" count). */
  step() {
    if (this.status !== "running") return;
    const frame = this.frames.at(-1)!;
    const stmt = frame.body[frame.i];
    this.line = stmt.line;
    try {
      if (this.steps >= MAX_LINES) {
        throw new RunFailure("INSTRUCTION_COUNT_LIMIT_EXCEEDED", `The program tried to process more than ${MAX_LINES} lines.`);
      }
      this.steps++;
      this.execute(stmt, frame);
      this.settle();
    } catch (failure) {
      if (!(failure instanceof RunFailure)) throw failure;
      this.error = { code: failure.code, line: stmt.line, message: failure.message };
      this.status = "error";
    }
  }

  snapshot(): Snapshot {
    return {
      status: this.status,
      line: this.line,
      robot: { ...this.robot },
      explored: [...this.explored],
      gold: [...this.gold],
      mined: this.mined,
      steps: this.steps,
      output: [...this.output],
      variables: [...this.vars],
      error: this.error,
    };
  }

  /** Drops finished blocks. A finished loop body leaves its `while` line to be re-evaluated. */
  private settle() {
    while (this.frames.length && this.frames.at(-1)!.i >= this.frames.at(-1)!.body.length) this.frames.pop();
    if (!this.frames.length) this.status = "done";
  }

  private index = (x: number, y: number) => y * this.map.cols + x;
  private inside = (x: number, y: number) => x >= 0 && y >= 0 && x < this.map.cols && y < this.map.rows;

  private execute(stmt: Stmt, frame: Frame) {
    switch (stmt.kind) {
      case "set": {
        const value = this.evaluate(stmt.expr);
        const previous = this.vars.get(stmt.name);
        if (previous !== undefined && typeof previous !== typeof value) {
          throw new RunFailure("E_TYPE_MISMATCH", `“${stmt.name}” holds ${typeName(previous)} and cannot be assigned ${typeName(value)}.`);
        }
        this.vars.set(stmt.name, value);
        frame.i++;
        break;
      }
      case "print": this.output.push(String(this.read(stmt.arg))); frame.i++; break;
      case "step": {
        const count = this.argument(stmt.arg, "step forward");
        const { dx, dy } = DIRECTIONS[this.robot.dir];
        for (let n = 0; n < count; n++) {
          const x = this.robot.x + dx;
          const y = this.robot.y + dy;
          if (!this.inside(x, y) || this.map.walls[this.index(x, y)]) {
            throw new RunFailure("E_BEDROCK_HIT", "The robot ran into bedrock or tried to leave the map.");
          }
          this.robot.x = x;
          this.robot.y = y;
          this.explored[this.index(x, y)] = true;
        }
        frame.i++;
        break;
      }
      case "turn":
        this.robot.dir = ((this.robot.dir + this.argument(stmt.arg, "turn by")) % 4) as Direction;
        frame.i++;
        break;
      case "mine": {
        const at = this.index(this.robot.x, this.robot.y);
        if (!this.gold[at]) throw new RunFailure("E_NO_GOLD", "There is no gold to mine on this cell.");
        this.gold[at] = false;
        this.mined++;
        frame.i++;
        break;
      }
      case "if": {
        const taken = this.condition(stmt.cond);
        frame.i++;
        if (taken) this.frames.push({ body: stmt.then, i: 0 });
        else if (stmt.else) this.frames.push({ body: [{ kind: "else", line: stmt.elseLine! }, ...stmt.else], i: 0 });
        break;
      }
      case "else": frame.i++; break; // the else line counts only when its branch runs
      case "while":
        if (this.condition(stmt.cond)) this.frames.push({ body: stmt.body, i: 0 });
        else frame.i++;
        break;
    }
  }

  private read(op: Operand): Value {
    if (op.kind !== "var") return op.value;
    const value = this.vars.get(op.name);
    if (value === undefined) throw new RunFailure("E_UNINITIALIZED", `“${op.name}” is read before it has been assigned.`);
    return value;
  }

  private condition(op: Operand): boolean {
    const value = this.read(op);
    if (typeof value !== "boolean") throw new RunFailure("E_NON_BOOL_CONDITION", "The condition must be a boolean, not an integer.");
    return value;
  }

  private argument(op: Operand, name: string): number {
    const value = this.read(op);
    if (typeof value !== "number" || value < 0) throw new RunFailure("E_BAD_ARG", `${name} needs a non-negative integer.`);
    return value;
  }

  /** Operands are read left to right and checked one by one; there is no short-circuiting. */
  private evaluate(expr: Expr): Value {
    switch (expr.kind) {
      case "value": return this.read(expr.a);
      case "not": {
        const value = this.read(expr.a);
        if (typeof value !== "boolean") throw new RunFailure("E_BAD_OPERAND", "not needs a boolean operand.");
        return !value;
      }
      case "isThere": {
        const kind = this.read(expr.a);
        if (typeof kind !== "number" || ![0, 1, 2].includes(kind)) {
          throw new RunFailure("E_BAD_ARG", "isThere needs 0 (empty), 1 (wall) or 2 (gold).");
        }
        return this.look(kind);
      }
      case "binary": {
        const { op } = expr;
        const equality = op === "=" || op === "<>";
        const wanted = op === "and" || op === "or" ? "boolean" : "number";
        const left = this.read(expr.a);
        if (!equality && typeof left !== wanted) throw new RunFailure("E_BAD_OPERAND", `${op} needs ${wanted === "number" ? "integer" : "boolean"} operands.`);
        const right = this.read(expr.b);
        if (equality ? typeof right !== typeof left : typeof right !== wanted) {
          throw new RunFailure("E_BAD_OPERAND", equality ? `${op} needs two operands of the same type.` : `${op} needs ${wanted === "number" ? "integer" : "boolean"} operands.`);
        }
        const a = left as number, b = right as number;
        switch (op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "<": return a < b;
          case "<=": return a <= b;
          case ">": return a > b;
          case ">=": return a >= b;
          case "=": return left === right;
          case "<>": return left !== right;
          case "and": return (left as boolean) && (right as boolean);
          default: return (left as boolean) || (right as boolean);
        }
      }
    }
  }

  /** isThere: inspects the cell in front of the robot; beyond the map edge counts as a wall. */
  private look(kind: number): boolean {
    const { dx, dy } = DIRECTIONS[this.robot.dir];
    const x = this.robot.x + dx;
    const y = this.robot.y + dy;
    if (!this.inside(x, y)) return kind === 1;
    this.explored[this.index(x, y)] = true;
    const at = this.index(x, y);
    const found = this.map.walls[at] ? 1 : this.gold[at] ? 2 : 0;
    return found === kind;
  }
}

export function idleSnapshot(map: GameMap): Snapshot {
  const machine = new Machine([{ kind: "mine", line: 0 }], map);
  return { ...machine.snapshot(), status: "idle" };
}
