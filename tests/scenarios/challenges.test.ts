import { describe, expect, test } from "bun:test";
import { run, trace, coordinates } from "../support/harness";

const COLLECT = `set count to 0
set wall to isThere 1
set moving to not wall
while moving
  set gold to isThere 2
  if gold
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set wall to isThere 1
  set moving to not wall
print count`;

describe("hard / PDF collector on independently counted maps", () => {
  for (const cells of ["........", "@@@@@@@@", "@.@.@.@.", ".@..@.@.", ".......@", "@......."]) {
    test(`collect ${cells}`, () => {
      const gold = cells.split("@").length - 1;
      const result = run(COLLECT, `3 10\n##########\n>${cells}#\n##########`);
      // 3 előkészítő + (távolság+1) while + (6*távolság+arany) törzs + a záró print.
      expect(result).toMatchObject({
        status: "done",
        mined: gold,
        steps: 5 + 7 * 8 + gold,
        output: [String(gold)],
        robot: { x: 8, y: 1, dir: 3 },
      });
      expect(result.gold.some(Boolean)).toBe(false);
      expect(coordinates(result.explored, 10)).toEqual(Array.from({ length: 10 }, (_, x) => `${x},1`));
    });
  }
  test("an immediately blocked collector finishes with zero gold", () => {
    expect(run(COLLECT, "1 2\n>#")).toMatchObject({ status: "done", mined: 0, steps: 5, output: ["0"] });
  });
});

describe("hard / algorithms expressed only in the PDF grammar", () => {
  for (const [n, expected] of [
    [0, 1],
    [1, 1],
    [5, 120],
    [10, 3628800],
  ] as const) {
    test(`factorial ${n}`, () => {
      const source = `set n to ${n}\nset product to 1\nset i to 1\nset more to i <= n\nwhile more\n  set product to product * i\n  set i to i + 1\n  set more to i <= n\nprint product`;
      expect(run(source)).toMatchObject({ status: "done", output: [String(expected)], steps: 6 + 4 * n });
    });
  }
  for (const [n, expected] of [
    [0, 0],
    [1, 1],
    [2, 1],
    [8, 21],
    [12, 144],
  ] as const) {
    test(`Fibonacci ${n} with temporary variables`, () => {
      const source = `set a to 0\nset b to 1\nset i to 0\nset more to i < ${n}\nwhile more\n  set next to a + b\n  set a to b\n  set b to next\n  set i to i + 1\n  set more to i < ${n}\nprint a`;
      expect(run(source)).toMatchObject({ status: "done", output: [String(expected)], steps: 6 + 6 * n });
    });
  }
  for (const [a, b, expected] of [
    [48, 18, 6],
    [17, 13, 1],
    [100, 25, 25],
    [7, 7, 7],
  ] as const) {
    test(`Euclid by subtraction gcd(${a}, ${b})`, () => {
      const code = `set a to ${a}\nset b to ${b}\nset different to a <> b\nwhile different\n  set larger to a > b\n  if larger\n    set a to a - b\n  else\n    set b to b - a\n  set different to a <> b\nprint a`;
      const result = run(code);
      expect(result).toMatchObject({ status: "done", output: [String(expected)] });
      expect(Object.fromEntries(result.variables)).toMatchObject({ a: expected, b: expected, different: false });
    });
  }
  test("nested multiplication table: globals reset at each outer iteration", () => {
    const code =
      "set row to 1\nset rows to true\nwhile rows\n  set col to 1\n  set cols to true\n  while cols\n    set value to row * col\n    print value\n    set col to col + 1\n    set cols to col <= 3\n  set row to row + 1\n  set rows to row <= 3";
    expect(run(code)).toMatchObject({
      status: "done",
      output: ["1", "2", "3", "2", "4", "6", "3", "6", "9"],
      steps: 66,
    });
  });
});

describe("adversarial / multi-room simulation and symmetry", () => {
  test("serpentine mining sweep combines nested loops, both else paths, turns, and mining", () => {
    const code = `set row to 0
set moreRows to true
set right to true
while moreRows
  set col to 0
  set moreCols to col < 4
  while moreCols
    step forward 1
    mine here
    set col to col + 1
    set moreCols to col < 4
  set row to row + 1
  set moreRows to row < 4
  if moreRows
    if right
      turn by 3
      step forward 1
      mine here
      turn by 3
    else
      turn by 1
      step forward 1
      mine here
      turn by 1
    set right to not right
print row`;
    // 3 előkészítő + 5 külső feltétel + 4*(2 kezdő + 5 belső feltétel + 16 törzs + 3 záró)
    // + 3*(1 belső if + 4 robothívás + 1 váltás) + 1 lefutó else + 1 záró print = 132.
    const states = trace(code, "4 5\n>@@@@\n@@@@@\n@@@@@\n@@@@@");
    const final = states.at(-1)!;
    expect(final).toMatchObject({
      status: "done",
      mined: 19,
      steps: 132,
      output: ["4"],
      robot: { x: 0, y: 3, dir: 1 },
    });
    expect(final.gold.some(Boolean)).toBe(false);
    expect(final.explored.every(Boolean)).toBe(true);
    for (const state of states) {
      expect(state.mined + state.gold.filter(Boolean).length).toBe(19);
      expect(state.robot.x).toBeGreaterThanOrEqual(0);
      expect(state.robot.x).toBeLessThan(5);
      expect(state.robot.y).toBeGreaterThanOrEqual(0);
      expect(state.robot.y).toBeLessThan(4);
    }
  });
  test("a four-room route collects exactly one nugget per room and returns to start", () => {
    const source =
      "step forward 2\nmine here\nturn by 3\nstep forward 2\nmine here\nturn by 3\nstep forward 2\nmine here\nturn by 3\nstep forward 2\nturn by 3";
    expect(run(source, "3 3\n>.@\n.#.\n@.@")).toMatchObject({
      status: "done",
      steps: 11,
      mined: 3,
      robot: { x: 0, y: 0, dir: 3 },
    });
  });
  test("rotation symmetry: identical relative programs work in all four orientations", () => {
    const maps = ["3 3\n.@.\n.^.\n...", "3 3\n...\n@<.\n...", "3 3\n...\n.v.\n.@.", "3 3\n...\n.>@\n..."];
    for (const map of maps) {
      const result = run("set found to isThere 2\nif found\n  step forward 1\n  mine here\nprint found", map);
      expect(result).toMatchObject({ status: "done", mined: 1, steps: 5, output: ["true"] });
      expect(result.explored.filter(Boolean)).toHaveLength(2);
    }
  });
  test("gold and console remain committed when an error interrupts nested loops", () => {
    const result = run(
      "set more to true\nwhile more\n  step forward 1\n  set gold to isThere 2\n  if gold\n    step forward 1\n    mine here\n    print 7\n    print missing\nprint 99",
    );
    expect(result).toMatchObject({
      status: "error",
      mined: 1,
      output: ["7"],
      steps: 9,
      robot: { x: 2, y: 1 },
      error: { code: "E_UNINITIALIZED", line: 9 },
    });
  });
});

describe("hard / generated serpentine sweeps including single-row and single-column maps", () => {
  for (let rows = 1; rows <= 8; rows++) {
    for (let cols = 1; cols <= 8; cols++) {
      test(`sweep ${rows} × ${cols}`, () => {
        const source = `set row to 0
set moreRows to true
set right to true
while moreRows
  set col to 0
  set moreCols to col < ${cols - 1}
  while moreCols
    step forward 1
    mine here
    set col to col + 1
    set moreCols to col < ${cols - 1}
  set row to row + 1
  set moreRows to row < ${rows}
  if moreRows
    if right
      turn by 3
      step forward 1
      mine here
      turn by 3
    else
      turn by 1
      step forward 1
      mine here
      turn by 1
    set right to not right
print row`;
        const map = `${rows} ${cols}\n${[">" + "@".repeat(cols - 1), ...Array(rows - 1).fill("@".repeat(cols))].join("\n")}`;
        const result = run(source, map);
        // A forrásból függetlenül levezetve: minden mezőt egyszer érint; soronként 5C+1 törzssor,
        // soronként váltáskor 6 sor, és minden második váltásnál az else is számít.
        expect(result).toMatchObject({
          status: "done",
          mined: rows * cols - 1,
          output: [String(rows)],
          steps: rows * (5 * cols + 8) - 1 + Math.floor((rows - 1) / 2),
          robot: { x: rows % 2 ? cols - 1 : 0, y: rows - 1, dir: rows % 2 ? 3 : 1 },
        });
        expect(result.gold.some(Boolean)).toBe(false);
        expect(result.explored.every(Boolean)).toBe(true);
      });
    }
  }
});
