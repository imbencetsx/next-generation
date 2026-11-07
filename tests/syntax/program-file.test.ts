import { describe, expect, test } from "bun:test";
import { EXAMPLES, programFilename, programName } from "../../lib/minescript";

describe("program file names", () => {
  test("the editable name drops the .mine or imported .txt extension, in any letter case", () => {
    expect(programName("collect-gold.mine")).toBe("collect-gold");
    expect(programName("Robot.MINE")).toBe("Robot");
    expect(programName("notes.txt")).toBe("notes");
    expect(programName("plain")).toBe("plain");
  });

  test("only the last extension is removed and other dots stay", () => {
    expect(programName("v1.2.mine")).toBe("v1.2");
    expect(programName("a.mine.mine")).toBe("a.mine");
  });

  test("characters that are not allowed in file names are removed", () => {
    expect(programName('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij");
    expect(programName("tab\there")).toBe("tabhere");
  });

  test("the name is capped at 100 characters", () => {
    expect(programName("x".repeat(150))).toHaveLength(100);
  });

  test("the exported file always ends in .mine, and an empty name falls back to untitled", () => {
    expect(programFilename("collect-gold")).toBe("collect-gold.mine");
    expect(programFilename("  ")).toBe("untitled.mine");
    expect(programFilename(" spaced ")).toBe("spaced.mine");
  });

  test("every built-in example round-trips through the name and back", () => {
    for (const example of EXAMPLES) expect(programFilename(programName(example.filename))).toBe(example.filename);
  });
});
