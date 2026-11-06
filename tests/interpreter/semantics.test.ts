import { describe, expect, test } from 'bun:test';
import { run } from '../support/harness';

// PDF §2.2.1–2: independent arithmetic/truth-table oracles, not engine-generated expectations.
const arithmetic = [
  ['+', (a: number, b: number) => a + b],
  ['-', (a: number, b: number) => a - b],
  ['*', (a: number, b: number) => a * b],
] as const;
const comparisons = [
  ['<', (a: number, b: number) => a < b], ['<=', (a: number, b: number) => a <= b],
  ['>', (a: number, b: number) => a > b], ['>=', (a: number, b: number) => a >= b],
  ['=', (a: number, b: number) => a === b], ['<>', (a: number, b: number) => a !== b],
] as const;

describe('easy / integers, arithmetic, and comparisons', () => {
  for (const [operator, oracle] of [...arithmetic, ...comparisons]) for (const a of [0, 1, 2, 50, 99, 100]) for (const b of [0, 1, 2, 50, 99, 100]) {
    test(`${a} ${operator} ${b}`, () => {
      const result = run(`set answer to ${a} ${operator} ${b}\nprint answer`);
      expect(result.status).toBe('done');
      expect(result.output).toEqual([String(oracle(a, b))]);
      expect(result.steps).toBe(2);
      expect(Object.fromEntries(result.variables).answer).toBe(oracle(a, b));
    });
  }
  for (const [expr, answer] of [['a + b', -3], ['a - b', -7], ['a * b', -10], ['a < b', true], ['a >= b', false], ['a <> b', true]] as const) test(`computed negative operands: ${expr}`, () => {
    expect(run(`set a to 0 - 5\nset b to 2\nset x to ${expr}\nprint x`).output).toEqual([String(answer)]);
  });
});

describe('easy / full boolean truth tables', () => {
  for (const a of [false, true]) for (const b of [false, true]) for (const [op, result] of [['and', a && b], ['or', a || b], ['=', a === b], ['<>', a !== b]] as const) {
    test(`${a} ${op} ${b}`, () => expect(run(`set x to ${a} ${op} ${b}\nprint x`).output).toEqual([String(result)]));
  }
  for (const a of [false, true]) test(`not ${a}`, () => expect(run(`set x to not ${a}\nprint x`).output).toEqual([String(!a)]));
});

describe('boundary / global variables and assignment', () => {
  for (const name of ['arany', 'Arany', 'constructor', 'toString', 'hasOwnProperty', 'x100']) test(`legal variable ${name}`, () => {
    expect(run(`set ${name} to 5\nset ${name} to ${name} + 1\nprint ${name}`).output).toEqual(['6']);
  });
  test('case-sensitive names retain independent types', () => expect(run('set x to 1\nset X to true\nprint x\nprint X').output).toEqual(['1', 'true']));
  test('variables created in an executed block live outside it', () => expect(run('if true\n  set local to 7\nprint local').output).toEqual(['7']));
  test('a skipped assignment never creates a variable', () => expect(run('if false\n  set local to 7\nprint local').error).toMatchObject({ code: 'E_UNINITIALIZED', line: 3 }));
  test('zero and false are initialized values', () => expect(run('set n to 0\nset b to false\nprint n\nprint b').output).toEqual(['0', 'false']));
  test('computed values may exceed literal bounds', () => expect(run('set x to 100 * 100\nset y to 0 - x\nprint x\nprint y').output).toEqual(['10000', '-10000']));
});
