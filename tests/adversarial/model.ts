// Független orákulum az adverzális tesztekhez: véletlen programgenerátor, MineScript forrássá alakító,
// és egy egyszerű, fát bejáró referencia-interpreter, közvetlenül a PDF szabályaiból megírva.
// Sem a termék tokenjei, sem az utasításai nem kerülnek bele; a motort ehhez mérjük.

import type { ErrorCode } from "../../lib/diagnostics";
import type { GameMap } from "../../lib/robot-map";

/** Egy simpleval: egész literál, logikai literál vagy változónév. */
export type Atom = number | boolean | string;

/** A `set` jobb oldala: `first` önmagában, `op first` (not / isThere), vagy `first op second`. */
export type Expr = { first: Atom; op?: string; second?: Atom };

export type Node = {
  kind: "set" | "print" | "step" | "turn" | "mine" | "if" | "while";
  /** A print/step/turn argumentuma, vagy az if/while feltétele. */
  arg?: Atom;
  name?: string;
  expr?: Expr;
  body?: Node[];
  otherwise?: Node[];
  /** A render() tölti ki: a csomópont és az `else` forrássora. */
  line?: number;
  elseLine?: number;
};

export const ops = ["+", "-", "*", "=", "<>", "<", "<=", ">", ">=", "and", "or"];

/** A PDF sorkorlátja (3.4), a motor konstansától függetlenül megadva. */
const LINE_LIMIT = 1000;

/** Determinisztikus álvéletlen-generátor (LCG): a `pick(n)` 0..n-1 közötti számot ad. */
export function random(seed: number) {
  let state = seed >>> 0;
  return (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % n;
  };
}

function renderStatement(node: Node): string {
  switch (node.kind) {
    case "set": {
      const { first, op, second } = node.expr!;
      if (op === "not" || op === "isThere") return `set ${node.name} to ${op} ${first}`;
      return `set ${node.name} to ${first}${op ? ` ${op} ${second}` : ""}`;
    }
    case "mine":
      return "mine here";
    case "step":
      return `step forward ${node.arg}`;
    case "turn":
      return `turn by ${node.arg}`;
    default:
      return `${node.kind} ${node.arg}`;
  }
}

/** MineScript forrás egy fából. Minden beágyazott blokk véletlen szélességű behúzást kap (1–4 szóköz). */
export function render(nodes: Node[], pick = random(1)): string {
  const lines: string[] = [];
  function block(body: Node[], indent: number) {
    for (const node of body) {
      node.line = lines.length + 1;
      lines.push(" ".repeat(indent) + renderStatement(node));
      if (node.body) block(node.body, indent + 1 + pick(4));
      if (node.otherwise) {
        node.elseLine = lines.length + 1;
        lines.push(" ".repeat(indent) + "else");
        block(node.otherwise, indent + 1 + pick(4));
      }
    }
  }
  block(nodes, 0);
  return lines.join("\n");
}

/** Véletlen, szintaktikailag helyes programfa (futáskor szándékosan hibázhat). */
export function generated(seed: number): Node[] {
  const pick = random(seed);
  // Értéket sosem kapó és csak betűméretben eltérő név is van benne, hogy E_UNINITIALIZED is előforduljon.
  const atoms: Atom[] = [0, 1, 2, 3, 100, true, false, "n", "flag", "missing", "N"];
  const atom = () => atoms[pick(atoms.length)];

  function block(depth: number): Node[] {
    return Array.from({ length: 1 + pick(6) }, (): Node => {
      // 0 mélységben csak egyszerű utasítás készül, így a beágyazás korlátos.
      switch (pick(depth ? 7 : 5)) {
        case 0: {
          const op = [undefined, "not", "isThere", ...ops][pick(14)];
          return { kind: "set", name: ["n", "flag", "x", "N"][pick(4)], expr: { first: atom(), op, second: atom() } };
        }
        case 1:
          return { kind: "print", arg: atom() };
        case 2:
          return { kind: "step", arg: atom() };
        case 3:
          return { kind: "turn", arg: atom() };
        case 4:
          return { kind: "mine" };
        case 5:
          return {
            kind: "if",
            arg: atom(),
            body: pick(4) ? block(depth - 1) : [],
            otherwise: pick(2) ? block(depth - 1) : undefined,
          };
        default:
          return { kind: "while", arg: atom(), body: pick(3) ? block(depth - 1) : [] };
      }
    });
  }

  // A biztosan sikeres eleje után a beágyazott vezérlés is lefuthat a szándékosan hibás argumentumok előtt.
  return [
    { kind: "set", name: "n", expr: { first: pick(4) } },
    { kind: "set", name: "flag", expr: { first: Boolean(pick(2)) } },
    ...block(3),
  ];
}

/** Véletlen, legfeljebb 5×5-ös térkép fallal és arannyal; a robot kezdőmezője mindig szabad. */
export function randomMap(seed: number): GameMap {
  const pick = random(seed);
  const rows = 1 + pick(5);
  const cols = 1 + pick(5);
  const walls = Array.from({ length: rows * cols }, () => pick(5) === 0);
  const gold = walls.map((wall) => !wall && pick(3) === 0);
  const start = pick(walls.length);
  walls[start] = false;
  gold[start] = false;
  const robot = { x: start % cols, y: Math.floor(start / cols), dir: pick(4) as 0 | 1 | 2 | 3 };
  return { rows, cols, walls, gold, robot };
}

type Value = number | boolean;
type Point = { x: number; y: number };
type Event = { line: number; kind: Node["kind"] | "else"; path: Point[]; printed?: string };

/** A referencia-interpreter ezt dobja, hogy az első futásidejű hibánál megálljon. */
type Failure = { code: ErrorCode; line: number };

/** Egy fa futtatása közvetlenül a PDF szabályai szerint: a végállapot és feldolgozott soronként egy esemény. */
export function reference(nodes: Node[], map: GameMap) {
  const robot = { ...map.robot };
  const gold = [...map.gold];
  const explored = gold.map(() => false);
  const vars = new Map<string, Value>();
  const output: string[] = [];
  const events: Event[] = [];
  let steps = 0;
  let mined = 0;
  let line = 0;
  let error: Failure | null = null;

  const cellIndex = ({ x, y }: Point) => y * map.cols + x;
  explored[cellIndex(robot)] = true;

  const fail = (code: ErrorCode): never => {
    throw { code, line } satisfies Failure;
  };
  const read = (atom: Atom): Value => {
    if (typeof atom !== "string") return atom;
    return vars.has(atom) ? vars.get(atom)! : fail("E_UNINITIALIZED");
  };
  const inside = ({ x, y }: Point) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const ahead = (): Point => {
    // Égtájak balra forgási sorrendben (észak, nyugat, dél, kelet), a DIRECTIONS-tól függetlenül.
    const deltas = [
      [0, -1],
      [-1, 0],
      [0, 1],
      [1, 0],
    ];
    const [dx, dy] = deltas[robot.dir];
    return { x: robot.x + dx, y: robot.y + dy };
  };

  function evaluate(expr: Expr): Value {
    const a = read(expr.first);
    if (!expr.op) return a;
    if (expr.op === "not") return typeof a === "boolean" ? !a : fail("E_BAD_OPERAND");
    if (expr.op === "isThere") {
      if (typeof a !== "number" || ![0, 1, 2].includes(a)) return fail("E_BAD_ARG");
      const target = ahead();
      if (!inside(target)) return a === 1; // A térképen kívül fal van.
      const at = cellIndex(target);
      explored[at] = true; // D4/D7: ideiglenes döntés.
      return a === (map.walls[at] ? 1 : gold[at] ? 2 : 0);
    }

    const isEquality = expr.op === "=" || expr.op === "<>";
    const wanted = expr.op === "and" || expr.op === "or" ? "boolean" : "number";
    if (!isEquality && typeof a !== wanted) return fail("E_BAD_OPERAND");
    const b = read(expr.second!); // Akkor is be kell olvasni, ha `a` már eldönti az eredményt (nincs rövidzár).
    if (typeof b !== (isEquality ? typeof a : wanted)) return fail("E_BAD_OPERAND");

    const x = a as number;
    const y = b as number;
    switch (expr.op) {
      case "+":
        return x + y;
      case "-":
        return x - y;
      case "*":
        return x * y;
      case "<":
        return x < y;
      case "<=":
        return x <= y;
      case ">":
        return x > y;
      case ">=":
        return x >= y;
      case "=":
        return a === b;
      case "<>":
        return a !== b;
      case "and":
        return a === true && b === true;
      case "or":
        return a === true || b === true;
      default:
        throw new Error(`Oracle operator ${expr.op}`);
    }
  }

  /** Egy feldolgozott sor számlálása; az 1001. sor helyett hiba jön. */
  function tick(at: number, kind: Event["kind"]): Event {
    line = at;
    const event: Event = { line, kind, path: [], printed: undefined };
    events.push(event);
    if (steps === LINE_LIMIT) fail("INSTRUCTION_COUNT_LIMIT_EXCEEDED");
    steps++;
    return event;
  }

  function condition(atom: Atom) {
    const value = read(atom);
    return typeof value === "boolean" ? value : fail("E_NON_BOOL_CONDITION");
  }

  function moveOrTurn(node: Node, event: Event) {
    const count = read(node.arg!);
    if (typeof count !== "number" || count < 0) fail("E_BAD_ARG");
    if (node.kind === "turn") {
      robot.dir = ((robot.dir + (count as number)) % 4) as 0 | 1 | 2 | 3;
      return;
    }
    for (let i = 0; i < (count as number); i++) {
      const next = ahead();
      if (!inside(next) || map.walls[cellIndex(next)]) fail("E_BEDROCK_HIT");
      Object.assign(robot, next); // D3: a már megtett mezők megmaradnak.
      event.path.push(next);
      explored[cellIndex(next)] = true; // D7.
    }
  }

  function block(body: Node[]) {
    for (const node of body) {
      const event = tick(node.line!, node.kind);
      switch (node.kind) {
        case "set": {
          const value = evaluate(node.expr!);
          if (vars.has(node.name!) && typeof vars.get(node.name!) !== typeof value) fail("E_TYPE_MISMATCH");
          vars.set(node.name!, value);
          break;
        }
        case "print":
          event.printed = String(read(node.arg!));
          output.push(event.printed);
          break;
        case "if":
          if (condition(node.arg!)) {
            block(node.body!);
          } else if (node.otherwise) {
            tick(node.elseLine!, "else"); // Az else csak akkor számít, ha az ága lefut.
            block(node.otherwise);
          }
          break;
        case "while":
          // A feltétel sora minden ellenőrzéskor számít, az utolsó hamisnál is.
          while (condition(node.arg!)) {
            block(node.body!);
            tick(node.line!, "while");
          }
          break;
        case "mine": {
          const at = cellIndex(robot);
          if (!gold[at]) fail("E_NO_GOLD");
          gold[at] = false;
          mined++;
          break;
        }
        case "turn":
        case "step":
          moveOrTurn(node, event);
          break;
      }
    }
  }

  try {
    block(nodes);
  } catch (caught) {
    if (!caught || typeof caught !== "object" || !("code" in caught)) throw caught;
    error = caught as Failure;
  }

  const status = error ? ("error" as const) : ("done" as const);
  return {
    state: { status, output, steps, mined, robot, gold, explored, variables: [...vars], error },
    events,
  };
}
