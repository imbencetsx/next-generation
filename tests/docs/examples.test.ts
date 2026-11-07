import { describe, expect, test } from "bun:test";
import { DOC_EXAMPLES, DOC_MAPS, matchesExpectation, type DocExample } from "../../lib/docs/examples";
import { validateMineScript } from "../../lib/minescript";
import { run } from "../support/harness";

// Az elvárások a dokumentációban vannak, de itt közvetlenül is ellenőrizzük őket, nem csak a doksi
// saját összevetőjén át: egy túl engedékeny összevető nem takarhat el hibás motort vagy példát.
describe("docs / every documented program is an executable contract", () => {
  for (const [id, example] of Object.entries(DOC_EXAMPLES) as [string, DocExample][]) {
    test(id, () => {
      const expected = example.expect;
      if (expected.kind === "syntax") {
        const issues = validateMineScript(example.code);
        expect(issues[0]?.line).toBe(expected.line);
        expect(matchesExpectation({ kind: "syntax", issues }, expected)).toBe(true);
        return;
      }
      const mapText = DOC_MAPS[example.map ?? "corridor"].text;
      const snapshot = run(example.code, mapText);
      if (expected.kind === "runtime") {
        expect(snapshot.status).toBe("error");
        expect(snapshot.error).toMatchObject({ code: expected.code, line: expected.line });
      } else {
        expect(snapshot.status).toBe("done");
        expect(snapshot.error).toBeNull();
        if (expected.output !== undefined) expect(snapshot.output).toEqual(expected.output);
        if (expected.steps !== undefined) expect(snapshot.steps).toBe(expected.steps);
        if (expected.mined !== undefined) expect(snapshot.mined).toBe(expected.mined);
      }
    });
  }
  test("matcher rejects wrong status, output, count, and runtime code", () => {
    const snapshot = run("print 1");
    const map = { rows: 1, cols: 1, walls: [false], gold: [false], robot: { x: 0, y: 0, dir: 3 as const } };
    const outcome = { kind: "run" as const, snapshot, map };
    for (const expected of [
      { kind: "ok" as const, output: ["2"] },
      { kind: "ok" as const, steps: 2 },
      { kind: "ok" as const, mined: 1 },
      { kind: "runtime" as const, code: "E_NO_GOLD" as const, line: 1 },
      { kind: "syntax" as const, line: 1 },
    ]) {
      expect(matchesExpectation(outcome, expected)).toBe(false);
    }
    expect(matchesExpectation({ kind: "run", map, snapshot: { ...snapshot, status: "error" } }, { kind: "ok" })).toBe(
      false,
    );
  });
});
