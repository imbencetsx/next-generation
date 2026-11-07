import { describe, expect, test } from "bun:test";
import { run } from "../support/harness";
import type { ErrorCode } from "../../lib/interpreter";

function failure(source: string, code: ErrorCode, line = 1) {
  const result = run(`${source}\nprint 99`);
  expect(result.status).toBe("error");
  expect(result.error).toMatchObject({ code, line });
  expect(result.error!.message.length).toBeGreaterThan(0);
  expect(result.line).toBe(line);
  expect(result.steps).toBe(line);
  expect(result.output).toEqual([]);
  return result;
}

describe("boundary / every runtime error (PDF §2.2.4)", () => {
  for (const code of [
    "print missing",
    "set x to missing",
    "set x to not missing",
    "set x to isThere missing",
    "step forward missing",
    "turn by missing",
    "if missing",
    "while missing",
  ]) {
    test(`uninitialized: ${code}`, () => {
      failure(code, "E_UNINITIALIZED");
    });
  }
  for (const [a, b] of [
    ["0", "false"],
    ["true", "1"],
    ["false", "0"],
    ["1", "true"],
  ]) {
    test(`type lock ${a} to ${b}`, () => {
      const result = failure(`set x to ${a}\nset x to ${b}`, "E_TYPE_MISMATCH", 2);
      expect(Object.fromEntries(result.variables).x).toBe(a === "true" ? true : a === "false" ? false : Number(a));
    });
  }
  for (const command of ["if", "while"]) {
    for (const value of [0, 1, 100]) {
      test(`no truthiness: ${command} ${value}`, () => {
        failure(`${command} ${value}`, "E_NON_BOOL_CONDITION");
      });
    }
  }
  for (const command of ["step forward", "turn by"]) {
    for (const value of ["true", "false"]) {
      test(`${command} ${value}`, () => {
        failure(`${command} ${value}`, "E_BAD_ARG");
      });
    }
  }
  for (const command of ["step forward", "turn by"]) {
    test(`negative ${command}`, () => {
      failure(`set n to 0 - 1\n${command} n`, "E_BAD_ARG", 2);
    });
  }
  for (const value of ["3", "100", "true", "false"]) {
    test(`bad isThere ${value}`, () => {
      failure(`set x to isThere ${value}`, "E_BAD_ARG");
    });
  }
  test("negative isThere", () => {
    failure("set n to 0 - 1\nset x to isThere n", "E_BAD_ARG", 2);
  });
  test("no gold at start", () => {
    failure("mine here", "E_NO_GOLD");
  });
  test("wall collision", () => {
    failure("turn by 1\nstep forward 1", "E_BEDROCK_HIT", 2);
  });
});

describe("hard / observable left-to-right error precedence (PDF §2.2.1)", () => {
  for (const op of ["+", "-", "*", "<", "<=", ">", ">="]) {
    test(`${op}: reject first operand before reading second`, () => {
      failure(`set x to true ${op} missing`, "E_BAD_OPERAND");
    });
    test(`${op}: read missing first operand first`, () => {
      failure(`set x to missing ${op} true`, "E_UNINITIALIZED");
    });
    test(`${op}: reject second operand after valid first`, () => {
      failure(`set x to 1 ${op} false`, "E_BAD_OPERAND");
    });
    test(`${op}: missing second operand`, () => {
      failure(`set x to 1 ${op} missing`, "E_UNINITIALIZED");
    });
  }
  for (const op of ["and", "or"]) {
    test(`${op}: invalid first operand wins`, () => {
      failure(`set x to 1 ${op} missing`, "E_BAD_OPERAND");
    });
    test(`${op}: invalid second operand`, () => {
      failure(`set x to true ${op} 1`, "E_BAD_OPERAND");
    });
    for (const value of ["true", "false"]) {
      test(`${value} ${op} missing never short-circuits`, () => {
        failure(`set x to ${value} ${op} missing`, "E_UNINITIALIZED");
      });
    }
  }
  for (const op of ["=", "<>"]) {
    for (const first of ["true", "1"]) {
      test(`${first} ${op} missing reads both before comparing types`, () => {
        failure(`set x to ${first} ${op} missing`, "E_UNINITIALIZED");
      });
    }
    for (const [a, b] of [
      ["1", "true"],
      ["false", "0"],
    ]) {
      test(`${a} ${op} ${b} has no coercion`, () => {
        failure(`set x to ${a} ${op} ${b}`, "E_BAD_OPERAND");
      });
    }
  }
  test("not accepts no integer coercion", () => {
    failure("set x to not 0", "E_BAD_OPERAND");
  });
  test("RHS failure precedes assignment type locking", () => {
    failure("set x to 1\nset x to true or missing", "E_UNINITIALIZED", 2);
  });
  test("failed first assignment does not create target", () =>
    expect(failure("set x to missing", "E_UNINITIALIZED").variables).toEqual([]));
  test("failed reassignment retains old value", () =>
    expect(failure("set x to 7\nset x to true + missing", "E_BAD_OPERAND", 2).variables).toEqual([["x", 7]]));
  test("existing output and gold survive a later error", () => {
    const result = run("step forward 2\nmine here\nprint 5\nprint missing\nprint 99");
    expect(result).toMatchObject({
      status: "error",
      steps: 4,
      mined: 1,
      output: ["5"],
      error: { code: "E_UNINITIALIZED", line: 4 },
    });
  });
});
