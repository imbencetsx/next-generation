import { describe, expect, test } from "bun:test";
import { parseProgram } from "../../lib/interpreter";
import { run, trace } from "../support/harness";

describe("easy / conditional branches and source-line traces", () => {
  for (const [condition, output, lines] of [
    [true, ["1", "3"], [1, 2, 5]],
    [false, ["2", "3"], [1, 3, 4, 5]],
  ] as const) {
    test(`if ${condition}`, () => {
      const code = `if ${condition}\n  print 1\nelse\n  print 2\nprint 3`;
      const states = trace(code);
      expect(states.map((s) => s.line)).toEqual([...lines]);
      expect(states.at(-1)!.output).toEqual([...output]);
      expect(states.at(-1)!.steps).toBe(lines.length);
    });
  }
  for (const condition of ["true", "false"]) {
    for (const suffix of ["", "\nelse", "\nelse\n  print 1"]) {
      test(`D2 empty then: ${condition}${JSON.stringify(suffix)}`, () => {
        const result = run(`if ${condition}${suffix}`);
        expect(result.status).toBe("done");
        expect(result.steps).toBe(condition === "true" || !suffix ? 1 : suffix.endsWith("1") ? 3 : 2);
      });
    }
  }
  test("false while checks once and skips invalid body", () => {
    const states = trace("while false\n  print missing\nprint 1");
    expect(states.map((s) => s.line)).toEqual([1, 3]);
    expect(states.at(-1)!.output).toEqual(["1"]);
  });
  test("while rereads a variable after each iteration and counts final false", () => {
    const states = trace("set n to 0\nset more to true\nwhile more\n  set n to n + 1\n  set more to n < 2\nprint n");
    expect(states.map((s) => s.line)).toEqual([1, 2, 3, 4, 5, 3, 4, 5, 3, 6]);
    expect(states.map((s) => s.steps)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(states.at(-1)!.output).toEqual(["2"]);
  });
});

describe("hard / nested blocks, empty bodies, and parser ownership", () => {
  test("nested else belongs to nearest if at the same indentation", () => {
    const code = "if true\n  if false\n    print 1\n  else\n    print 2\nelse\n  print 3\nprint 4";
    expect(trace(code).map((s) => s.line)).toEqual([1, 2, 4, 5, 8]);
    expect(run(code).output).toEqual(["2", "4"]);
  });
  test("outer false skips the entire nested subtree", () => {
    const code = "if false\n  if true\n    print missing\n  else\n    mine here\nelse\n   print 2\nprint 4";
    expect(trace(code).map((s) => s.line)).toEqual([1, 6, 7, 8]);
    expect(run(code).output).toEqual(["2", "4"]);
  });
  test("empty inner if does not steal an outer else", () =>
    expect(run("if true\n  if false\n  else\n    print 7\nelse\n  print 9").output).toEqual(["7"]));
  test("loop and conditional stacks resume their parent correctly", () => {
    const code =
      "set i to 0\nset more to true\nwhile more\n  set i to i + 1\n  set first to i = 1\n  if first\n    print i\n  else\n    print 0\n  set more to i < 2\nprint 9";
    expect(trace(code).map((s) => s.line)).toEqual([1, 2, 3, 4, 5, 6, 7, 10, 3, 4, 5, 6, 8, 9, 10, 3, 11]);
    expect(run(code).output).toEqual(["1", "0", "9"]);
  });
  test("parse tree preserves CRLF source lines and else line", () => {
    const parsed = parseProgram("if false\r\n  print 1\r\nelse\r\n  print 2\r\nprint 3\r\n");
    expect(parsed.ok).toBe(true);
    // A lefordított program lapos utasításlista; minden utasítás megőrzi a forrássorát.
    if (parsed.ok) {
      expect(parsed.program.instructions.map((ins) => [ins.kind, ins.span.line])).toEqual([
        ["if", 1],
        ["print", 2],
        ["else", 3],
        ["print", 4],
        ["print", 5],
      ]);
    }
  });
  test("128 nested conditionals execute without losing source ownership", () => {
    const code = [
      ...Array.from({ length: 128 }, (_, i) => " ".repeat(i) + "if true"),
      " ".repeat(128) + "print 7",
      "print 8",
    ].join("\n");
    const result = run(code);
    expect(result).toMatchObject({ status: "done", steps: 130, line: 130, output: ["7", "8"] });
  });
  test("parsing accepts semantic errors but rejects malformed dead code", () => {
    expect(parseProgram("if false\n  set x to true + missing").ok).toBe(true);
    expect(parseProgram("if false\n  print 101").ok).toBe(false);
  });
});
