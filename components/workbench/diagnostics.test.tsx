import { describe, expect, test } from "vitest";
import { ERROR_CODES, SYNTAX_CODES, type Diagnostic } from "@/lib/diagnostics";
import { localizedDiagnostic } from "@/i18n/diagnostics";
import { localizedMapError } from "@/i18n/map-errors";
import { validateMineScript } from "@/lib/minescript";
import { parseMap } from "@/lib/robot-map";

describe("diagnostic presentation", () => {
  test("all error codes have Hungarian explanations without changing engine diagnostics", () => {
    for (const code of [...ERROR_CODES, ...SYNTAX_CODES]) {
      const original: Diagnostic = {
        code,
        message: "Original detail",
        hint: "Original hint",
        line: 3,
        column: 4,
        endColumn: 8,
        related: [{ line: 1, message: "Original related detail" }],
      };
      const translated = localizedDiagnostic(original, "hu");
      expect(translated.message).not.toBe(original.message);
      expect(translated.hint).not.toBe(original.hint);
      expect(translated).toMatchObject({ code, line: 3, column: 4, endColumn: 8, related: [{ line: 1 }] });
      expect(localizedDiagnostic(original, "en")).toBe(original);
      expect(original.message).toBe("Original detail");
    }
  });

  test("a misspelled keyword keeps its exact corrected code in the Hungarian hint", () => {
    const issue = validateMineScript("step forwrd 1")[0];
    const translated = localizedDiagnostic(issue, "hu");
    expect(translated.message).toContain("“forward”");
    expect(translated.message).toContain("“forwrd”");
    expect(translated.hint).toContain("\nstep forward 1");
    expect(translated.hint).not.toContain("forwrd 1");
  });

  test("map parser failures are explained in Hungarian and retain the English original on demand", () => {
    for (const text of ["oops", "16 1", "2 1\n>", "1 2\n>", "1 1\n.", "1 2\n>>", "1 2\n>?"]) {
      const result = parseMap(text);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(localizedMapError(result.error, "hu")).not.toBe(result.error);
      expect(localizedMapError(result.error, "en")).toBe(result.error);
    }
  });
});
