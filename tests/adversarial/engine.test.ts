import { expect, test } from 'bun:test';
import { Machine, parseProgram } from '../../lib/interpreter';
import { validateMineScript } from '../../lib/minescript';
import { CORRIDOR, SPEC_MAP, finish, mapFrom } from '../support/harness';
import { generated, ops, random, randomMap, reference, render, type Node } from './model';

const syntaxCodes = new Set(`S_EMPTY_LINE S_TAB S_SPACING S_TRAILING_SPACE S_INVALID_CHARACTER S_UNKNOWN_INSTRUCTION S_EXPECTED_KEYWORD S_MISSING_VALUE S_EXTRA_TOKENS S_COMPLEX_VALUE S_NUMBER_RANGE S_INVALID_VALUE S_RESERVED_NAME S_INVALID_NAME S_INVALID_EXPRESSION S_UNKNOWN_OPERATOR S_UNEXPECTED_INDENT S_INDENT_MISMATCH S_ELSE_WITHOUT_IF S_ELSE_MISALIGNED S_DUPLICATE_ELSE`.split(' '));
const runtimeCodes = new Set(`E_TYPE_MISMATCH E_UNINITIALIZED E_NON_BOOL_CONDITION E_BAD_OPERAND E_BEDROCK_HIT E_NO_GOLD E_BAD_ARG INSTRUCTION_COUNT_LIMIT_EXCEEDED`.split(' '));
const structural = new Set(['S_UNEXPECTED_INDENT', 'S_INDENT_MISMATCH', 'S_ELSE_WITHOUT_IF', 'S_ELSE_MISALIGNED', 'S_DUPLICATE_ELSE']);
const lexical = new Set(['S_TAB', 'S_SPACING', 'S_TRAILING_SPACE', 'S_INVALID_CHARACTER', 'S_EMPTY_LINE']);

function checkSource(source: string) {
  const issues = validateMineScript(source), parsed = parseProgram(source);
  expect(parsed.ok).toBe(issues.length === 0);
  if (!parsed.ok) expect(parsed.issues).toEqual(issues);
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const categories = new Set<string>();
  let previous = [0, 0];
  for (const d of issues) {
    expect(syntaxCodes.has(d.code)).toBe(true);
    expect(Number.isInteger(d.line) && d.line >= 1 && d.line <= lines.length).toBe(true);
    expect(Number.isInteger(d.column) && Number.isInteger(d.endColumn)).toBe(true);
    expect(d.column >= 1 && d.endColumn > d.column && d.endColumn <= Math.max(2, lines[d.line - 1].length + 1)).toBe(true);
    expect(d.message.trim().length).toBeGreaterThan(0);
    expect(d.line > previous[0] || (d.line === previous[0] && d.column >= previous[1])).toBe(true);
    previous = [d.line, d.column];
    const category = `${d.line}:${structural.has(d.code) ? 'structural' : lexical.has(d.code) ? d.code : 'content'}`;
    expect(categories.has(category)).toBe(false); categories.add(category);
    for (const r of d.related ?? []) {
      expect(Number.isInteger(r.line) && r.line >= 1 && r.line <= lines.length).toBe(true);
      expect(r.message.trim().length).toBeGreaterThan(0);
    }
    if (d.code === 'S_INVALID_CHARACTER') expect(issues.filter(x => x.line === d.line && !lexical.has(x.code) && !structural.has(x.code))).toEqual([]);
  }
  if (parsed.ok) {
    const state = finish(new Machine(parsed.program, mapFrom()));
    if (state.error) {
      const d = state.error;
      expect(runtimeCodes.has(d.code)).toBe(true);
      expect(Number.isInteger(d.line) && d.line >= 1 && d.line <= lines.length).toBe(true);
      expect(Number.isInteger(d.column) && Number.isInteger(d.endColumn)).toBe(true);
      expect(d.column >= 1 && d.endColumn > d.column && d.endColumn <= lines[d.line - 1].length + 1).toBe(true);
      expect(d.message.trim().length).toBeGreaterThan(0);
    }
  }
}

test('adversarial: 4,000 seeded token/character/whitespace sources preserve diagnostic shape and parser parity', () => {
  const alphabet = ['set', 'Set', 'PRINT', 'print', 'step', 'forward', 'turn', 'by', 'mine', 'here', 'if', 'else', 'while', 'isThere', 'isthere', 'not', 'and', 'AND', 'or', 'to', 'true', 'false', 'x', 'X', 'While', 'a1', '100', '101', '007', '0', '+', '-', '*', '=', '<>', '<', '<=', '>', '>=', '==', '=>', '!=', '\t', '  ', ' ', 'á', '\u00a0', '😀', '(', ')', ';', '#', '/', '_', '\u0000'];
  for (const seed of [1, 0xdeadbeef, 42, 0x80000000]) {
    const pick = random(seed);
    for (let i = 0; i < 1000; i++) {
      const lines = Array.from({ length: pick(9) }, () => ' '.repeat(pick(7)) + Array.from({ length: pick(9) }, () => alphabet[pick(alphabet.length)]).join(['', ' ', '  ', '\t'][pick(4)]) + (pick(4) ? '' : ' '));
      const source = lines.join(pick(2) ? '\n' : '\r\n') + (pick(3) ? '' : '\n');
      try { checkSource(source); } catch (e) { throw new Error(`seed=${seed}, case=${i}, source=${JSON.stringify(source)}`, { cause: e }); }
    }
  }
});

function compare(nodes: Node[], map: ReturnType<typeof mapFrom>, seed: number) {
  const source = render(nodes, random(seed));
  const parsed = parseProgram(source);
  if (!parsed.ok) throw new Error(`Generated grammar rejected:\n${source}\n${JSON.stringify(parsed.issues)}`);
  const expected = reference(nodes, map);
  const machine = new Machine(parsed.program, map);
  const events = [];
  const printed: string[] = [];
  let position = { x: map.robot.x, y: map.robot.y };
  for (let calls = 0; machine.status === 'running'; calls++) {
    if (calls >= 1002) throw new Error('Adversarial fuse');
    const before = machine.snapshot();
    const event = machine.step()!;
    expect<number | null>(event.line).toBe(before.nextLine);
    expect<string>(event.kind).toBe(source.split('\n')[event.line - 1].trimStart().split(' ')[0]);
    for (const cell of event.path) {
      expect(Math.abs(cell.x - position.x) + Math.abs(cell.y - position.y)).toBe(1);
      expect(cell.x >= 0 && cell.x < map.cols && cell.y >= 0 && cell.y < map.rows).toBe(true);
      expect(map.walls[cell.y * map.cols + cell.x]).toBe(false);
      position = cell;
    }
    if (event.printed !== undefined) printed.push(event.printed);
    events.push({ ...event, printed: event.printed });
    const after = machine.snapshot();
    expect({ x: after.robot.x, y: after.robot.y }).toEqual(position);
    expect(after.explored.every((bit, at) => !before.explored[at] || bit)).toBe(true);
  }
  const final = machine.snapshot();
  if (final.error) {
    const d = final.error;
    const lines = source.split('\n');
    expect(runtimeCodes.has(d.code)).toBe(true);
    expect(Number.isInteger(d.line) && d.line >= 1 && d.line <= lines.length).toBe(true);
    expect(Number.isInteger(d.column) && Number.isInteger(d.endColumn)).toBe(true);
    expect(d.column >= 1 && d.column < d.endColumn && d.endColumn <= lines[d.line - 1].length + 1).toBe(true);
    expect(d.message.trim().length).toBeGreaterThan(0);
    for (const related of d.related ?? []) {
      expect(Number.isInteger(related.line) && related.line >= 1 && related.line <= lines.length).toBe(true);
      expect(related.message.trim().length).toBeGreaterThan(0);
    }
  }
  const actual = { status: final.status, output: final.output, steps: final.steps, mined: final.mined, robot: final.robot, gold: final.gold, explored: final.explored, variables: final.variables, error: final.error && { code: final.error.code, line: final.error.line } };
  try {
    expect(actual).toEqual(expected.state);
    expect(events).toEqual(expected.events.map(e => ({ ...e, printed: e.printed })));
    expect(events.length).toBe(final.steps + (final.error?.code === 'INSTRUCTION_COUNT_LIMIT_EXCEEDED' ? 1 : 0));
    expect(printed).toEqual(final.output);
    expect(final.nextLine).toBeNull();
    expect(machine.step()).toBeNull();
    expect(machine.snapshot()).toEqual(final);
  } catch (e) { throw new Error(`seed=${seed}\nsource:\n${source}\nmap=${JSON.stringify(map)}\nexpected=${JSON.stringify(expected.state)}\nactual=${JSON.stringify(actual)}`, { cause: e }); }
}

test('adversarial: 600 grammar-generated trees × three maps match independent PDF tree walker and events (D3/D4/D7 provisional)', () => {
  for (let seed = 1; seed <= 600; seed++) {
    for (const map of [mapFrom(CORRIDOR), mapFrom(SPEC_MAP), randomMap(seed)]) compare(generated(seed), map, seed);
  }
});

test('adversarial: successful nested loops, every operator, sensors and mining reach full traces on three maps', () => {
  for (let seed = 1; seed <= 60; seed++) {
    // Fresh targets avoid type locking hiding later operator coverage.
    const nodes: Node[] = ops.map((op, i) => ({ kind: 'set', name: `v${i}`, expr: { a: op === 'and' || op === 'or' ? true : 3, op, b: op === 'and' || op === 'or' ? false : 2 } }));
    nodes.push({ kind: 'set', name: 'i', expr: { a: 0 } }, { kind: 'set', name: 'more', expr: { a: true } },
      { kind: 'while', a: 'more', body: [
        { kind: 'if', a: true, body: [{ kind: 'if', a: false, body: [{ kind: 'print', a: 'missing' }], otherwise: [{ kind: 'print', a: 'i' }] }], otherwise: [] },
        { kind: 'set', name: 'i', expr: { a: 'i', op: '+', b: 1 } },
        { kind: 'set', name: 'more', expr: { a: 'i', op: '<', b: seed % 5 + 1 } },
      ] });
    for (let i = 0; i < 12; i++) nodes.push(
      { kind: 'set', name: 'wall', expr: { a: 1, op: 'isThere' } },
      { kind: 'if', a: 'wall', body: [{ kind: 'turn', a: 1 }], otherwise: [
        { kind: 'set', name: 'empty', expr: { a: 0, op: 'isThere' } },
        { kind: 'set', name: 'gold', expr: { a: 2, op: 'isThere' } }, { kind: 'step', a: 1 },
        { kind: 'if', a: 'gold', body: [{ kind: 'mine' }], otherwise: [] },
      ] });
    for (const map of [mapFrom(CORRIDOR), mapFrom(SPEC_MAP), randomMap(seed)]) compare(nodes, map, seed);
  }
});

for (const [name, nodes] of [
  ['empty true loop', [{ kind: 'while', a: true, body: [] }]],
  ['nested empty loops', [{ kind: 'while', a: true, body: [{ kind: 'if', a: false, body: [], otherwise: [{ kind: 'while', a: true, body: [] }] }] }]],
  ['exactly 1000', Array.from({ length: 1000 }, () => ({ kind: 'turn', a: 0 }))],
  ['rejected print', [...Array.from({ length: 1000 }, () => ({ kind: 'turn', a: 0 })), { kind: 'print', a: 1 }]],
  ['partial collision', [{ kind: 'step', a: 100 }]],
] as [string, Node[]][]) test(`adversarial boundary events: ${name}`, () => compare(nodes, mapFrom(), 91));

for (const head of ['if', 'if true extra', 'while', 'while true extra', 'else true', 'if @', 'while @', 'else @']) {
  test(`recovery: erroring ${JSON.stringify(head)} still opens its body`, () => {
    const source = `${head}\n  print 1`;
    expect(validateMineScript(source).filter(d => d.code === 'S_UNEXPECTED_INDENT')).toEqual([]);
  });
}
for (const source of ['\tprint 1', 'if true\n  print 1\n\telse', 'if true\n  if true\n    print 1\n \tprint 2']) {
  test(`recovery: tab indentation suppresses structure on tab line ${JSON.stringify(source)}`, () => {
    const tabLine = source.split('\n').findIndex(s => s.includes('\t')) + 1;
    expect(validateMineScript(source).filter(d => d.line === tabLine && structural.has(d.code))).toEqual([]);
  });
}
for (const [source, code, line] of [
  ['if true\n  print 1\n  else\n    print 2', 'S_ELSE_MISALIGNED', 3],
  ['if true\nelse\nelse', 'S_DUPLICATE_ELSE', 3],
  ['if true\nprint 1\nelse', 'S_ELSE_WITHOUT_IF', 3],
  ['while false\nelse', 'S_ELSE_WITHOUT_IF', 2],
] as const) test(`D1 recovery: ${code} at ${line} in ${JSON.stringify(source)}`, () => {
  expect(validateMineScript(source).map(d => [d.code, d.line])).toEqual([[code, line]]);
});
