import { describe, expect, test } from "bun:test";
import { idleSnapshot } from "../../lib/interpreter";
import { parseMap } from "../../lib/robot-map";
import { finish, machineFrom, mapFrom } from "../support/harness";

// Helyi kiegészítések, hogy a szerződés akkor is forduljon, amíg a nyilvános típusok még hiányoznak.
type Next = { nextLine: number | null };
type LocalEvent = { line: number; kind: string; path: { x: number; y: number }[]; printed?: string };
const stepEvent = (machine: ReturnType<typeof machineFrom>) => machine.step() as unknown as LocalEvent | null;
const next = (machine: ReturnType<typeof machineFrom>) => (machine.snapshot() as unknown as Next).nextLine;

describe("engine diagnostics / next instruction and events", () => {
  for (const [name, source, lines] of [
    ["then skips else", "if true\n  print 1\nelse\n  print 2\nprint 3", [1, 2, 5]],
    ["else has its own event", "if false\n  print 1\nelse\n  print 2\nprint 3", [1, 3, 4, 5]],
    ["empty branches", "if false\nelse\nprint 1", [1, 2, 3]],
    ["loop jumps and final false check", "set a to true\nwhile a\n  set a to false\nprint 1", [1, 2, 3, 2, 4]],
    ["false empty loop", "while false\nprint 1", [1, 2]],
    ["nested branches", "if true\n  if false\n    print 0\n  else\n    print 1\nprint 2", [1, 2, 4, 5, 6]],
  ] as const) {
    test(`nextLine ${name}`, () => {
      const machine = machineFrom(source);
      for (const line of lines) {
        expect(next(machine)).toBe(line);
        const event = stepEvent(machine);
        expect(event).toMatchObject({ line, path: [] });
      }
      expect(machine.status).toBe("done");
      expect(next(machine)).toBeNull();
      expect(stepEvent(machine)).toBeNull();
    });
  }
  test("nextLine idle and empty program", () => {
    expect((idleSnapshot(mapFrom()) as unknown as Next).nextLine).toBeNull();
    const machine = machineFrom("");
    expect(next(machine)).toBeNull();
    expect(stepEvent(machine)).toBeNull();
  });
  test("nextLine empty true loop stays at while, then null at limit", () => {
    const machine = machineFrom("while true");
    for (let i = 0; i < 1000; i++) {
      expect(next(machine)).toBe(1);
      expect(stepEvent(machine)).toEqual({ line: 1, kind: "while", path: [] });
    }
    expect(next(machine)).toBe(1);
    expect(stepEvent(machine)).toEqual({ line: 1, kind: "while", path: [] });
    expect(machine.status).toBe("error");
    expect(next(machine)).toBeNull();
    expect(stepEvent(machine)).toBeNull();
  });
  test("StepEvent all nonmoving kinds and print text", () => {
    const machine = machineFrom(
      "set x to 3\nturn by 0\nstep forward 0\nif false\nelse\nprint x\nprint true\nwhile false",
    );
    for (const [line, kind, printed] of [
      [1, "set"],
      [2, "turn"],
      [3, "step"],
      [4, "if"],
      [5, "else"],
      [6, "print", "3"],
      [7, "print", "true"],
      [8, "while"],
    ] as const) {
      expect(stepEvent(machine)).toEqual({ line, kind, path: [], ...(printed === undefined ? {} : { printed }) });
    }
    expect(next(machine)).toBeNull();
  });
  test("StepEvent path ordered, gold passed over, mine and negative printed value", () => {
    const machine = machineFrom("step forward 2\nmine here\nset n to 0 - 1\nprint n");
    expect(stepEvent(machine)).toEqual({
      line: 1,
      kind: "step",
      path: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    });
    expect(machine.snapshot().mined).toBe(0);
    expect(stepEvent(machine)).toEqual({ line: 2, kind: "mine", path: [] });
    expect(stepEvent(machine)).toEqual({ line: 3, kind: "set", path: [] });
    expect(stepEvent(machine)).toEqual({ line: 4, kind: "print", path: [], printed: "-1" });
  });
  test("StepEvent partial collision path (D3), then no-op after error", () => {
    const machine = machineFrom("step forward 7\nstep forward 5");
    stepEvent(machine);
    expect(stepEvent(machine)).toEqual({ line: 2, kind: "step", path: [{ x: 8, y: 1 }] });
    expect(machine.snapshot().error?.code).toBe("E_BEDROCK_HIT");
    expect(next(machine)).toBeNull();
    expect(stepEvent(machine)).toBeNull();
  });
  test("StepEvent failed print has no printed field", () => {
    const machine = machineFrom("print missing");
    expect(stepEvent(machine)).toEqual({ line: 1, kind: "print", path: [] });
    expect(next(machine)).toBeNull();
    expect(stepEvent(machine)).toBeNull();
  });
  test("nextLine null after finish helper", () => {
    const machine = machineFrom("print 1");
    finish(machine);
    expect(next(machine)).toBeNull();
  });
});

describe("map diagnostics / specific source lines", () => {
  for (const [name, text, line] of [
    ["malformed header", "1  1\n>", 1],
    ["row too short", "2 2\n>.\n.", 3],
    ["row too long", "1 1\n>.", 2],
    ["invalid symbol", "2 2\n>.\n.#x", 3],
    ["invalid symbol correct width", "2 2\n>.\n.x", 3],
    ["second robot", "2 2\n>.\n.^", 3],
    ["CRLF source line", "2 2\r\n>.\r\n.x\r\n", 3],
  ] as const) {
    test(`parseMap ${name}`, () => {
      const parsed = parseMap(text);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect((parsed as { line?: number }).line).toBe(line);
        expect(parsed.error).toContain(`Line ${line}`);
      }
    });
  }
});
