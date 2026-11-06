import { describe, expect, test } from 'bun:test';
import { MAP_PRESETS, parseMap } from '../../lib/robot-map';
import { SPEC_MAP, mapFrom } from '../support/harness';

describe('easy / PDF §1 map format', () => {
  test('PDF example has exact dimensions, gold, and east-facing robot', () => {
    const map = mapFrom(SPEC_MAP);
    expect([map.rows, map.cols]).toEqual([3, 15]);
    expect(map.robot).toEqual({ x: 11, y: 2, dir: 3 });
    expect(map.gold.flatMap((v, i) => v ? [i] : [])).toEqual([4, 37]);
    expect(map.walls.filter(Boolean)).toHaveLength(13);
  });
  for (const [symbol, dir] of [['^', 0], ['<', 1], ['v', 2], ['>', 3]] as const) test(`robot ${symbol}`, () => {
    const map = mapFrom(`1 1\n${symbol}`);
    expect(map.robot).toEqual({ x: 0, y: 0, dir });
    expect(map.gold).toEqual([false]); expect(map.walls).toEqual([false]);
  });
  for (const preset of MAP_PRESETS) test(`built-in map ${preset.name}`, () => expect(parseMap(preset.text).ok).toBe(true));
});

describe('boundary / all 225 legal dimension pairs', () => {
  for (let rows = 1; rows <= 15; rows++) for (let cols = 1; cols <= 15; cols++) test(`${rows} rows by ${cols} columns`, () => {
    const body = ['>' + '.'.repeat(cols - 1), ...Array.from({ length: rows - 1 }, () => '.'.repeat(cols))];
    const map = mapFrom(`${rows} ${cols}\n${body.join('\n')}`);
    expect([map.rows, map.cols, map.walls.length, map.gold.length]).toEqual([rows, cols, rows * cols, rows * cols]);
    expect(map.robot).toEqual({ x: 0, y: 0, dir: 3 });
    expect(map.walls.some(Boolean) || map.gold.some(Boolean)).toBe(false);
  });
});

describe('adversarial / invalid imports never produce a partial map', () => {
  const files = ['', '1', '1  1\n>', ' 1 1\n>', '1 1 \n>', '1\t1\n>', '0 1\n>', '1 0\n>', '16 1\n>', '1 16\n>', '-1 1\n>', '1.5 1\n>', '1 1', '2 1\n>', '1 1\n>\n.', '1 2\n>', '1 1\n>.', '1 1\n.', '1 2\n><', '1 1\nX', '1 1\nV', '1 1\n→', '1 1\n ', '1 2\n>\t', '1 1\n>\n\n'];
  for (const text of files) test(JSON.stringify(text), () => {
    const parsed = parseMap(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) { expect(parsed.error.length).toBeGreaterThan(0); expect('map' in parsed).toBe(false); }
  });
  test('D5: newline and CRLF file termination', () => expect(mapFrom('1 2\r\n>@\r\n')).toEqual(mapFrom('1 2\n>@')));
  test('row error identifies the file line', () => {
    const result = parseMap('2 3\n>..\n..');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Line 3');
  });

});
