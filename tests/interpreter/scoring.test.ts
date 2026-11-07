import { describe, expect, test } from "bun:test";
import { isBetterScore, scoreProgram, scoreRank } from "../../lib/scoring";
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
