// A MineScript nyilvános belépési pontja a felület számára: a programfájl kiterjesztése, a beépített
// példaprogramok (lib/examples.ts) és a szintaktikai ellenőrzés. Maga az elemzés a lib/syntax/ mappában van
// (analyzeSource), egyetlen közös menetben a futtatható program előállításával.

import { analyzeSource } from "./syntax";
import type { SyntaxIssue } from "./diagnostics";

export { KEYWORDS, TOKEN_PATTERNS, isBooleanLiteral, isIdentifier } from "./syntax";
export type { Diagnostic, SyntaxCode, SyntaxIssue } from "./diagnostics";
export { EXAMPLES } from "./examples";

/** A programfájlok kiterjesztése (importnál és exportnál). */
export const PROGRAM_EXTENSION = ".mine";

/** Minden szintaktikai hiba soronként, oszloponként rendezve. Típusokat nem ellenőriz: azok futáskor derülnek ki. */
export function validateMineScript(source: string): SyntaxIssue[] {
  return analyzeSource(source).issues;
}
