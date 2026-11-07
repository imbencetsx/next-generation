import { describe, expect, test } from "bun:test";
import { run, machineFrom } from "../support/harness";

describe("boundary / PDF §3.4 processed-line budget", () => {
  for (const size of [0, 1, 999, 1000]) {
    test(`${size} straight-line instructions finish`, () => {
      const result = run(Array(size).fill("step forward 0").join("\n"));
      expect(result).toMatchObject({ status: "done", steps: size, error: null, mined: 0 });
    });
  }
  test("1001st instruction is not executed", () => {
    const result = run([...Array(1000).fill("step forward 0"), "print 99"].join("\n"));
    expect(result).toMatchObject({
      status: "error",
      steps: 1000,
      output: [],
      error: { code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED", line: 1001 },
    });
  });
  test("the 1000th instruction may print successfully", () => {
    expect(run([...Array(999).fill("step forward 0"), "print 99"].join("\n"))).toMatchObject({
      status: "done",
      steps: 1000,
      output: ["99"],
    });
  });
  test("limit precedes semantic evaluation of the 1001st line", () => {
    const result = run([...Array(1000).fill("step forward 0"), "print missing"].join("\n"));
    expect(result.error?.code).toBe("INSTRUCTION_COUNT_LIMIT_EXCEEDED");
  });
  test("a runtime failure on instruction 1000 is still that runtime failure", () => {
    const result = run([...Array(999).fill("step forward 0"), "mine here"].join("\n"));
    expect(result).toMatchObject({ steps: 1000, error: { code: "E_NO_GOLD", line: 1000 } });
  });
  for (const [factorA, factorB, expectedStatus, errorLine] of [
    [83, 4, "done", null],
    [37, 9, "error", 5],
  ] as const) {
    test(`loop target ${factorA} * ${factorB}`, () => {
      // előkészítés=3, ciklusfeltétel=N+1, törzs=2N => 4+3N. N=332 esetén pontosan 1000-nél ér véget.
      const result = run(
        `set i to 0\nset lim to ${factorA} * ${factorB}\nset more to i < lim\nwhile more\n  set i to i + 1\n  set more to i < lim`,
      );
      expect(result.status).toBe(expectedStatus);
      expect(result.steps).toBe(1000);
      if (errorLine) expect(result.error).toMatchObject({ code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED", line: errorLine });
      else expect(result.error).toBeNull();
    });
  }
  for (const code of [
    "while true",
    "set r to true\nwhile r",
    "while true\n  if false",
    "while true\n  if false\n  else",
  ]) {
    test(`D2: nonterminating blocks: ${JSON.stringify(code)}`, () => {
      const result = run(code);
      expect(result).toMatchObject({
        status: "error",
        steps: 1000,
        error: { code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED" },
      });
    });
  }
  test("1000th step is distinct from the following limit check", () => {
    const machine = machineFrom("while true");
    for (let i = 0; i < 1000; i++) machine.step();
    expect(machine.snapshot()).toMatchObject({ status: "running", steps: 1000, error: null });
    machine.step();
    expect(machine.snapshot()).toMatchObject({
      status: "error",
      steps: 1000,
      error: { line: 1, code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED" },
    });
  });
  test("skipped source lines consume no execution budget", () => {
    const code = ["if false", ...Array(1100).fill("  print missing"), "print 7"].join("\n");
    expect(run(code)).toMatchObject({ status: "done", steps: 2, output: ["7"] });
  });
});
