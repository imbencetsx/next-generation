import { describe, expect, test } from "bun:test";
import { decodeRobot, encodeRobot, isBetterScore, scoreProgram, scoreRank, traceProgram } from "../../lib/scoring";
import { CORRIDOR, mapFrom } from "../support/harness";

// PDF 3.5: több arany előrébb; azonos aranynál a kevesebb lépés. A lépés a feldolgozott programsorok száma (3.4).
const PDF_PROGRAM = `set count to 0
set fal to isThere 1
set megy to not fal
while megy
  set arany to isThere 2
  if arany
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set fal to isThere 1
  set megy to not fal
print count`;

describe("scoring / a run's result for the leaderboard", () => {
  test("the PDF example on Corridor mines 3 gold in 64 processed lines", () => {
    expect(scoreProgram(PDF_PROGRAM, mapFrom(CORRIDOR))).toEqual({
      ok: true,
      run: { gold: 3, steps: 64, errorCode: null },
    });
  });

  test("a run that stops with a runtime error keeps the gold mined and lines processed before it", () => {
    const result = scoreProgram("step forward 2\nmine here\nmine here", mapFrom(CORRIDOR));
    expect(result).toEqual({ ok: true, run: { gold: 1, steps: 3, errorCode: "E_NO_GOLD" } });
  });

  test("a run stopped by the line limit counts exactly 1000 processed lines", () => {
    const result = scoreProgram("set r to true\nwhile r\n  set r to true", mapFrom(CORRIDOR));
    expect(result).toEqual({ ok: true, run: { gold: 0, steps: 1000, errorCode: "INSTRUCTION_COUNT_LIMIT_EXCEEDED" } });
  });

  test("the empty program is a valid run with no gold and no steps", () => {
    expect(scoreProgram("", mapFrom(CORRIDOR))).toEqual({ ok: true, run: { gold: 0, steps: 0, errorCode: null } });
  });

  test("a syntactically invalid program cannot be scored", () => {
    const result = scoreProgram("Set x to 1", mapFrom(CORRIDOR));
    expect(result.ok).toBe(false);
  });

  test("more gold wins; with equal gold, fewer steps win; an exact tie is not an improvement", () => {
    expect(isBetterScore({ gold: 2, steps: 900 }, { gold: 1, steps: 5 })).toBe(true);
    expect(isBetterScore({ gold: 1, steps: 5 }, { gold: 2, steps: 900 })).toBe(false);
    expect(isBetterScore({ gold: 3, steps: 60 }, { gold: 3, steps: 64 })).toBe(true);
    expect(isBetterScore({ gold: 3, steps: 64 }, { gold: 3, steps: 60 })).toBe(false);
    expect(isBetterScore({ gold: 3, steps: 64 }, { gold: 3, steps: 64 })).toBe(false);
  });

  test("the rank key orders every pair of results exactly like the comparison", () => {
    const scores = [0, 1, 2, 225].flatMap((gold) => [0, 1, 64, 999, 1000].map((steps) => ({ gold, steps })));
    for (const a of scores) {
      for (const b of scores) expect(scoreRank(a) > scoreRank(b)).toBe(isBetterScore(a, b));
    }
  });
});

// A szellem (a ranglista első helyezettjének visszajátszása) a robot helyét kapja minden feldolgozott sor után.
describe("scoring / the robot's path line by line (ghost replay)", () => {
  const corridor = mapFrom(CORRIDOR);
  const at = (trace: number[], steps: number) => decodeRobot(trace[steps], corridor.cols);

  test("has one position per processed line plus the start, ending where the run ends", () => {
    const trace = traceProgram(PDF_PROGRAM, corridor)!;
    expect(trace).toHaveLength(64 + 1);
    expect(at(trace, 0)).toEqual({ x: 0, y: 1, dir: 3 });
    // A fal előtti utolsó mezőn áll, kelet felé (a 9. oszlop, 0-tól 8).
    expect(at(trace, 64)).toEqual({ x: 8, y: 1, dir: 3 });
  });

  test("a multi-cell step is one line, and turning changes only the direction", () => {
    const trace = traceProgram("step forward 3\nturn by 1", corridor)!;
    expect(trace.map((code) => decodeRobot(code, corridor.cols))).toEqual([
      { x: 0, y: 1, dir: 3 },
      { x: 3, y: 1, dir: 3 },
      { x: 3, y: 1, dir: 0 },
    ]);
  });

  test("stops at the position of a runtime error (D3: the free cells are walked first)", () => {
    const trace = traceProgram("step forward 20", corridor)!;
    expect(trace).toHaveLength(2);
    expect(at(trace, 1)).toEqual({ x: 8, y: 1, dir: 3 });
  });

  test("the 1000-line limit does not add a position for the line it refuses", () => {
    const trace = traceProgram("set r to true\nwhile r\n  turn by 1", corridor)!;
    expect(trace).toHaveLength(1000 + 1);
  });

  test("a syntactically invalid program has no path, and encoding round-trips", () => {
    expect(traceProgram("Set x to 1", corridor)).toBeNull();
    const robot = { x: 4, y: 2, dir: 1 as const };
    expect(decodeRobot(encodeRobot(robot, 7), 7)).toEqual(robot);
  });
});
