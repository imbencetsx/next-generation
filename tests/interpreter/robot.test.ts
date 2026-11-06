import { describe, expect, test } from 'bun:test';
import { run, trace, coordinates } from '../support/harness';

// These direction vectors are the PDF's cardinal directions, independent of DIRECTIONS.
const headings = [
  { symbol: '^', dir: 0, dx: 0, dy: -1 },
  { symbol: '<', dir: 1, dx: -1, dy: 0 },
  { symbol: 'v', dir: 2, dx: 0, dy: 1 },
  { symbol: '>', dir: 3, dx: 1, dy: 0 },
] as const;
function field(symbol: string, ahead = '.', dx = 0, dy = 0) {
  const cells = Array.from({ length: 5 }, () => Array<string>(5).fill('.'));
  cells[2][2] = symbol; cells[2 + dy][2 + dx] = ahead;
  if (dx === 0 && dy === 0) cells[2][2] = symbol;
  return `5 5\n${cells.map(row => row.join('')).join('\n')}`;
}

describe('easy / motion and counter-clockwise rotation (PDF §2.2.3)', () => {
  for (const h of headings) for (const turns of [0, 1, 2, 3, 4, 5, 7, 50, 99, 100]) test(`${h.symbol} turn ${turns} quarters left`, () => {
    const result = run(`turn by ${turns}`, field(h.symbol));
    expect([result.robot.x, result.robot.y]).toEqual([2, 2]);
    expect(Number(result.robot.dir)).toBe((h.dir + turns) % 4);
    expect(result.steps).toBe(1); expect(result.status).toBe('done');
  });
  for (const h of headings) for (const distance of [0, 1, 2]) test(`${h.symbol} moves ${distance} cells in one source line`, () => {
    const result = run(`step forward ${distance}`, field(h.symbol));
    expect(result.robot).toEqual({ x: 2 + h.dx * distance, y: 2 + h.dy * distance, dir: h.dir });
    expect(result.steps).toBe(1);
    expect(result.explored.filter(Boolean)).toHaveLength(distance + 1);
  });
  test('computed API parameters can exceed 100', () => expect(run('set n to 100 * 100\nturn by n').robot.dir).toBe(3));
  test('a multi-cell move leaves every gold nugget untouched', () => {
    const result = run('step forward 4', '1 5\n>@@@@');
    expect(result).toMatchObject({ mined: 0, steps: 1, status: 'done' });
    expect(result.gold).toEqual([false, true, true, true, true]);
  });
});

describe('boundary / sensor truth tables in every orientation', () => {
  for (const h of headings) for (const [cell, kind] of [['.', 0], ['#', 1], ['@', 2]] as const) for (const query of [0, 1, 2]) test(`${h.symbol} sees ${cell}; isThere ${query}`, () => {
    const result = run(`set found to isThere ${query}\nprint found`, field(h.symbol, cell, h.dx, h.dy));
    expect(result.status).toBe('done');
    expect(result.output).toEqual([String(kind === query)]); // D4: gold is not empty.
    expect(result.robot).toEqual({ x: 2, y: 2, dir: h.dir });
    expect(result.mined).toBe(0);
    expect(coordinates(result.explored, 5).sort()).toEqual(['2,2', `${2 + h.dx},${2 + h.dy}`].sort());
  });
  for (const h of headings) for (const query of [0, 1, 2]) test(`outside the map is wall: ${h.symbol}, query ${query}`, () => {
    const result = run(`set found to isThere ${query}\nprint found`, `1 1\n${h.symbol}`);
    expect(result.output).toEqual([String(query === 1)]);
    expect(result.explored).toEqual([true]);
  });
  test('isThere checks only the adjacent cell, not gold behind it', () => expect(run('set found to isThere 2\nprint found', '1 3\n>.@').output).toEqual(['false']));
  test('an invalid sensor parameter does not reveal a cell', () => expect(run('set x to isThere true', '1 2\n>.').explored).toEqual([true, false]));
});

describe('hard / collision, mining, and exploration', () => {
  for (const h of headings) test(`D3: partial move before leaving ${h.symbol} edge`, () => {
    const result = run('step forward 100\nprint 99', field(h.symbol));
    expect(result.error).toMatchObject({ code: 'E_BEDROCK_HIT', line: 1 });
    expect(result.robot).toEqual({ x: 2 + h.dx * 2, y: 2 + h.dy * 2, dir: h.dir });
    expect(result.explored.filter(Boolean)).toHaveLength(3);
    expect(result.steps).toBe(1); expect(result.output).toEqual([]);
  });
  test('D3: preserves two successful cells before an interior wall', () => {
    const result = run('step forward 5', '1 6\n>.@#..');
    expect(result.robot).toEqual({ x: 2, y: 0, dir: 3 });
    expect(result.error?.code).toBe('E_BEDROCK_HIT');
    expect(result.gold[2]).toBe(true); expect(result.mined).toBe(0);
    expect(result.explored.slice(0, 3)).toEqual([true, true, true]);
  });
  test('mine removes exactly the current nugget; a second mine fails', () => {
    const result = run('step forward 1\nmine here\nmine here\nprint 99', '1 3\n>@@');
    expect(result).toMatchObject({ mined: 1, steps: 3, output: [], error: { code: 'E_NO_GOLD', line: 3 } });
    expect(result.gold).toEqual([false, false, true]);
  });
  test('previously mined cell becomes empty to a returning sensor', () => {
    const code = 'step forward 1\nmine here\nturn by 2\nstep forward 1\nturn by 2\nset empty to isThere 0\nset gold to isThere 2\nprint empty\nprint gold';
    expect(run(code, '1 2\n>@').output).toEqual(['true', 'false']);
  });
  test('exploration is monotonic and repeated sensing adds no extra cell', () => {
    const states = trace('set a to isThere 2\nset b to isThere 1\nstep forward 2\nturn by 2\nstep forward 1', '1 4\n>.@.');
    expect(states.map(s => s.explored.filter(Boolean).length)).toEqual([2, 2, 3, 3, 3]);
    for (let i = 1; i < states.length; i++) states[i - 1].explored.forEach((bit, cell) => { if (bit) expect(states[i].explored[cell]).toBe(true); });
  });
  test('turning and printing do not discover adjacent cells', () => expect(run('turn by 1\nprint true', field('>')).explored.filter(Boolean)).toHaveLength(1));
});
