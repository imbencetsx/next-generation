import type { ErrorCode } from '../../lib/diagnostics';
import type { GameMap } from '../../lib/robot-map';

// Independent generated AST: neither production tokens nor instructions enter this oracle.
export type Atom = number | boolean | string;
export type Expr = { a: Atom; op?: string; b?: Atom };
export type Node = {
  kind: 'set' | 'print' | 'step' | 'turn' | 'mine' | 'if' | 'while';
  a?: Atom; name?: string; expr?: Expr; body?: Node[]; otherwise?: Node[];
  line?: number; elseLine?: number;
};
export const ops = ['+', '-', '*', '=', '<>', '<', '<=', '>', '>=', 'and', 'or'];
export function random(seed: number) {
  let state = seed >>> 0;
  return (n: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % n; };
}
export function render(nodes: Node[], pick = random(1)): string {
  const lines: string[] = [];
  function block(body: Node[], indent: number) {
    for (const node of body) {
      node.line = lines.length + 1;
      let text: string;
      switch (node.kind) {
        case 'set': {
          const e = node.expr!;
          text = `set ${node.name} to ${e.op === 'not' || e.op === 'isThere' ? `${e.op} ${e.a}` : `${e.a}${e.op ? ` ${e.op} ${e.b}` : ''}`}`;
          break;
        }
        case 'mine': text = 'mine here'; break;
        case 'step': text = `step forward ${node.a}`; break;
        case 'turn': text = `turn by ${node.a}`; break;
        default: text = `${node.kind} ${node.a}`;
      }
      lines.push(' '.repeat(indent) + text);
      if (node.body) block(node.body, indent + 1 + pick(4));
      if (node.otherwise) {
        node.elseLine = lines.length + 1;
        lines.push(' '.repeat(indent) + 'else');
        block(node.otherwise, indent + 1 + pick(4));
      }
    }
  }
  block(nodes, 0);
  return lines.join('\n');
}
export function generated(seed: number): Node[] {
  const pick = random(seed);
  const atoms: Atom[] = [0, 1, 2, 3, 100, true, false, 'n', 'flag', 'missing', 'N'];
  const atom = () => atoms[pick(atoms.length)];
  function block(depth: number): Node[] {
    return Array.from({ length: 1 + pick(6) }, (): Node => {
      switch (pick(depth ? 7 : 5)) {
        case 0: {
          const op = [undefined, 'not', 'isThere', ...ops][pick(14)];
          return { kind: 'set', name: ['n', 'flag', 'x', 'N'][pick(4)], expr: { a: atom(), op, b: atom() } };
        }
        case 1: return { kind: 'print', a: atom() };
        case 2: return { kind: 'step', a: atom() };
        case 3: return { kind: 'turn', a: atom() };
        case 4: return { kind: 'mine' };
        case 5: return { kind: 'if', a: atom(), body: pick(4) ? block(depth - 1) : [], otherwise: pick(2) ? block(depth - 1) : undefined };
        default: return { kind: 'while', a: atom(), body: pick(3) ? block(depth - 1) : [] };
      }
    });
  }
  // A successful prefix lets nested control flow run before deliberately bad arguments.
  return [{ kind: 'set', name: 'n', expr: { a: pick(4) } },
    { kind: 'set', name: 'flag', expr: { a: Boolean(pick(2)) } }, ...block(3)];
}
export function randomMap(seed: number): GameMap {
  const pick = random(seed);
  const rows = 1 + pick(5), cols = 1 + pick(5);
  const walls = Array.from({ length: rows * cols }, () => pick(5) === 0);
  const gold = walls.map(wall => !wall && pick(3) === 0);
  const at = pick(walls.length);
  walls[at] = false; gold[at] = false;
  return { rows, cols, walls, gold, robot: { x: at % cols, y: Math.floor(at / cols), dir: pick(4) as 0 | 1 | 2 | 3 } };
}
export function reference(nodes: Node[], map: GameMap) {
  const robot = { ...map.robot }, gold = [...map.gold], explored = gold.map(() => false);
  const vars = new Map<string, number | boolean>(), output: string[] = [];
  const events: { line: number; kind: Node['kind'] | 'else'; path: { x: number; y: number }[]; printed?: string }[] = [];
  let steps = 0, mined = 0, line = 0;
  let error: { code: ErrorCode; line: number } | null = null;
  explored[robot.y * map.cols + robot.x] = true;
  const fail = (code: ErrorCode): never => { throw { code, line }; };
  const read = (a: Atom): number | boolean => typeof a !== 'string' ? a : vars.has(a) ? vars.get(a)! : fail('E_UNINITIALIZED');
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const ahead = () => {
    // Cardinal left rotation, independently specified without DIRECTIONS.
    const deltas = [[0, -1], [-1, 0], [0, 1], [1, 0]];
    return { x: robot.x + deltas[robot.dir][0], y: robot.y + deltas[robot.dir][1] };
  };
  function evaluate(e: Expr): number | boolean {
    const a = read(e.a);
    if (!e.op) return a;
    if (e.op === 'not') return typeof a === 'boolean' ? !a : fail('E_BAD_OPERAND');
    if (e.op === 'isThere') {
      if (typeof a !== 'number' || ![0, 1, 2].includes(a)) return fail('E_BAD_ARG');
      const { x, y } = ahead();
      if (!inside(x, y)) return a === 1;
      const at = y * map.cols + x;
      explored[at] = true; // D4/D7 provisional.
      return a === (map.walls[at] ? 1 : gold[at] ? 2 : 0);
    }
    const equality = e.op === '=' || e.op === '<>';
    const type = e.op === 'and' || e.op === 'or' ? 'boolean' : 'number';
    if (!equality && typeof a !== type) return fail('E_BAD_OPERAND');
    const b = read(e.b!); // Must read even when a determines a logical result.
    if (typeof b !== (equality ? typeof a : type)) return fail('E_BAD_OPERAND');
    const x = a as number, y = b as number;
    switch (e.op) {
      case '+': return x + y; case '-': return x - y; case '*': return x * y;
      case '<': return x < y; case '<=': return x <= y; case '>': return x > y; case '>=': return x >= y;
      case '=': return a === b; case '<>': return a !== b;
      case 'and': return a === true && b === true; case 'or': return a === true || b === true;
      default: throw new Error(`Oracle operator ${e.op}`);
    }
  }
  function tick(at: number, kind: Node['kind'] | 'else') {
    line = at;
    const event = { line, kind, path: [] as { x: number; y: number }[], printed: undefined as string | undefined };
    events.push(event);
    if (steps === 1000) fail('INSTRUCTION_COUNT_LIMIT_EXCEEDED');
    steps++;
    return event;
  }
  function condition(a: Atom) {
    const value = read(a);
    return typeof value === 'boolean' ? value : fail('E_NON_BOOL_CONDITION');
  }
  function block(body: Node[]) {
    for (const n of body) {
      const event = tick(n.line!, n.kind);
      switch (n.kind) {
        case 'set': {
          const value = evaluate(n.expr!);
          if (vars.has(n.name!) && typeof vars.get(n.name!) !== typeof value) fail('E_TYPE_MISMATCH');
          vars.set(n.name!, value); break;
        }
        case 'print': event.printed = String(read(n.a!)); output.push(event.printed); break;
        case 'if':
          if (condition(n.a!)) block(n.body!);
          else if (n.otherwise) { tick(n.elseLine!, 'else'); block(n.otherwise); }
          break;
        case 'while':
          while (condition(n.a!)) { block(n.body!); tick(n.line!, 'while'); }
          break;
        case 'mine': {
          const at = robot.y * map.cols + robot.x;
          if (!gold[at]) fail('E_NO_GOLD');
          gold[at] = false; mined++; break;
        }
        case 'turn': case 'step': {
          const count = read(n.a!);
          if (typeof count !== 'number' || count < 0) fail('E_BAD_ARG');
          if (n.kind === 'turn') { robot.dir = ((robot.dir + (count as number)) % 4) as 0 | 1 | 2 | 3; break; }
          for (let i = 0; i < (count as number); i++) {
            const next = ahead();
            if (!inside(next.x, next.y) || map.walls[next.y * map.cols + next.x]) fail('E_BEDROCK_HIT');
            Object.assign(robot, next); event.path.push(next); explored[next.y * map.cols + next.x] = true; // D3/D7.
          }
          break;
        }
      }
    }
  }
  try { block(nodes); } catch (e) {
    if (!e || typeof e !== 'object' || !('code' in e)) throw e;
    error = e as { code: ErrorCode; line: number };
  }
  return { state: { status: error ? 'error' as const : 'done' as const, output, steps, mined, robot, gold, explored, variables: [...vars], error }, events };
}
