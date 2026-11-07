import { describe, expect, test } from "bun:test";
import { run } from "../support/harness";

type ErrorDetail = {
  code: string;
  line: number;
  column: number;
  endColumn: number;
  message: string;
  hint?: string;
  related?: { line: number; message: string }[];
};
function failure(
  source: string,
  code: string,
  line: number,
  column: number,
  endColumn: number,
  words: string[],
  related?: number[],
  hints: string[] = [],
) {
  const result = run(source);
  expect(result.status).toBe("error");
  const error = result.error as ErrorDetail | null;
  expect(error).toMatchObject({ code, line, column, endColumn });
  for (const word of words) expect(error!.message).toContain(word);
  for (const word of hints) expect(error!.hint).toContain(word);
  if (related) expect(error!.related?.map((r) => r.line)).toEqual(related);
  return result;
}

describe("runtime diagnostics / variables and type checking", () => {
  for (const [source, start, end] of [
    ["print missing", 7, 14],
    ["set x to missing", 10, 17],
    ["set x to not missing", 14, 21],
    ["set x to isThere missing", 18, 25],
    ["step forward missing", 14, 21],
    ["turn by missing", 9, 16],
    ["if missing", 4, 11],
    ["while missing", 7, 14],
  ] as const) {
    test(`E_UNINITIALIZED ${source}`, () => {
      failure(source, "E_UNINITIALIZED", 1, start, end, ["missing"]);
    });
  }
  test("E_UNINITIALIZED case-only suggestion", () => {
    failure("set Gold to 2\nprint gold", "E_UNINITIALIZED", 2, 7, 11, ["gold"], undefined, ["Gold"]);
  });
  test("E_UNINITIALIZED no short-circuit", () => {
    failure("set x to true or missing", "E_UNINITIALIZED", 1, 18, 25, ["missing"]);
  });
  test("E_UNINITIALIZED equality reads RHS before checking type", () => {
    failure("set x to true = missing", "E_UNINITIALIZED", 1, 17, 24, ["missing"]);
  });
  for (const [old, value, oldType, newType] of [
    ["1", "true", "integer", "boolean"],
    ["false", "2", "boolean", "integer"],
  ] as const) {
    test(`E_TYPE_MISMATCH ${oldType} to ${newType}`, () => {
      failure(
        `set Gold to ${old}\nset Gold to ${old}\nset Gold to ${value}`,
        "E_TYPE_MISMATCH",
        3,
        5,
        9,
        ["Gold", oldType, newType, value],
        [1],
      );
    });
  }
  test("E_TYPE_MISMATCH nested first assignment supplies related source line", () => {
    failure("if true\n  set x to false\nset x to 7", "E_TYPE_MISMATCH", 3, 5, 6, ["x", "boolean", "integer", "7"], [2]);
  });
  for (const [source, start, end, words] of [
    ["set x to true + missing", 10, 14, ["+", "true", "boolean"]],
    ["set x to 1 + false", 14, 19, ["+", "false", "boolean"]],
    ["set x to false < missing", 10, 15, ["<", "false", "boolean"]],
    ["set x to 1 >= true", 15, 19, [">=", "true", "boolean"]],
    ["set x to 0 and missing", 10, 11, ["and", "0", "integer"]],
    ["set x to true or 1", 18, 19, ["or", "1", "integer"]],
    ["set x to not 0", 14, 15, ["not", "0", "integer"]],
    ["set x to 1 = true", 14, 18, ["=", "true", "boolean"]],
    ["set x to false <> 0", 19, 20, ["<>", "0", "integer"]],
  ] as const) {
    test(`E_BAD_OPERAND ${source}`, () => {
      failure(source, "E_BAD_OPERAND", 1, start, end, [...words]);
    });
  }
  test("E_BAD_OPERAND variable value and indented source span", () => {
    failure("set a to true\nif true\n  set x to a * 2", "E_BAD_OPERAND", 3, 12, 13, ["*", "true", "boolean"]);
  });
  for (const [command, value, start, end] of [
    ["if", "0", 4, 5],
    ["if", "100", 4, 7],
    ["while", "0", 7, 8],
    ["while", "100", 7, 10],
  ] as const) {
    test(`E_NON_BOOL_CONDITION ${command} ${value}`, () => {
      const result = failure(`${command} ${value}`, "E_NON_BOOL_CONDITION", 1, start, end, [command, value]);
      expect((result.error as ErrorDetail).hint).toMatch(/<>|set/);
    });
  }
  test("E_NON_BOOL_CONDITION variable highlights condition", () => {
    const result = failure("set n to 1\nif true\n  while n", "E_NON_BOOL_CONDITION", 3, 9, 10, ["while", "1"]);
    expect((result.error as ErrorDetail).hint).toMatch(/<>|set/);
  });
});

describe("runtime diagnostics / API, coordinates and provenance", () => {
  for (const [source, line, start, end, command, value] of [
    ["step forward true", 1, 14, 18, "step forward", "true"],
    ["turn by false", 1, 9, 14, "turn by", "false"],
    ["set x to isThere 3", 1, 18, 19, "isThere", "3"],
    ["set x to isThere 100", 1, 18, 21, "isThere", "100"],
    ["set x to isThere true", 1, 18, 22, "isThere", "true"],
    ["set n to 0 - 1\nstep forward n", 2, 14, 15, "step forward", "-1"],
    ["set n to 0 - 1\nturn by n", 2, 9, 10, "turn by", "-1"],
    ["set n to 0 - 1\nset x to isThere n", 2, 18, 19, "isThere", "-1"],
  ] as const) {
    test(`E_BAD_ARG ${source}`, () => {
      failure(source, "E_BAD_ARG", line, start, end, [command, value]);
    });
  }
  // A D3 (részleges mozgás) és a D7 (felfedezés) ideiglenes projektdöntés.
  test("E_BEDROCK_HIT partial movement (D3), statement and wall coordinates", () => {
    const result = failure(
      "step forward 6\nif true\n  step forward 5",
      "E_BEDROCK_HIT",
      3,
      3,
      17,
      ["2 of 5", "row 2, column 9", "row 2, column 10"],
      undefined,
      ["isThere 1"],
    );
    expect(result.robot).toMatchObject({ x: 8, y: 1 });
    expect(result.steps).toBe(3);
  });
  test("E_BEDROCK_HIT immediately adjacent wall", () => {
    failure(
      "turn by 1\nstep forward 1",
      "E_BEDROCK_HIT",
      2,
      1,
      15,
      ["0 of 1", "row 2, column 1", "row 1, column 1"],
      undefined,
      ["isThere 1"],
    );
  });
  test("E_BEDROCK_HIT map edge", () => {
    const result = failure(
      "turn by 2\nstep forward 1",
      "E_BEDROCK_HIT",
      2,
      1,
      15,
      ["0 of 1", "row 2, column 1"],
      undefined,
      ["isThere 1"],
    );
    expect(result.error!.message.toLowerCase()).toContain("edge");
  });
  test("E_NO_GOLD no nugget at start", () => {
    const result = failure("mine here", "E_NO_GOLD", 1, 1, 10, ["row 2, column 1"]);
    expect((result.error as ErrorDetail).related ?? []).toEqual([]);
  });
  test("E_NO_GOLD previous mining source line", () => {
    failure("step forward 2\nmine here\nif true\n  mine here", "E_NO_GOLD", 4, 3, 12, ["row 2, column 3"], [2]);
  });
  test("E_NO_GOLD provenance follows cell after leaving and returning", () => {
    failure(
      "step forward 2\nmine here\nstep forward 3\nmine here\nturn by 2\nstep forward 3\nmine here",
      "E_NO_GOLD",
      7,
      1,
      10,
      ["row 2, column 3"],
      [2],
    );
  });
});

describe("runtime diagnostics / instruction limit", () => {
  test("INSTRUCTION_COUNT_LIMIT_EXCEEDED empty while", () => {
    const result = failure("while true", "INSTRUCTION_COUNT_LIMIT_EXCEEDED", 1, 1, 11, ["1000"], [1]);
    expect(result.steps).toBe(1000);
  });
  test("INSTRUCTION_COUNT_LIMIT_EXCEEDED most-executed nested while", () => {
    failure("while true\n  while true", "INSTRUCTION_COUNT_LIMIT_EXCEEDED", 2, 3, 13, ["1000"], [2]);
  });
  test("INSTRUCTION_COUNT_LIMIT_EXCEEDED tied while counts choose earliest", () => {
    // Minden 4 soros kör: külső while, set, hamis belső while, print.
    failure(
      "while true\n  set a to false\n  while a\n  print 0",
      "INSTRUCTION_COUNT_LIMIT_EXCEEDED",
      1,
      1,
      11,
      ["1000"],
      [1],
    );
  });
  test("INSTRUCTION_COUNT_LIMIT_EXCEEDED no while has no related line", () => {
    const result = failure(Array(1001).fill("print 0").join("\n"), "INSTRUCTION_COUNT_LIMIT_EXCEEDED", 1001, 1, 8, [
      "1000",
    ]);
    expect((result.error as ErrorDetail).related ?? []).toEqual([]);
  });
});
