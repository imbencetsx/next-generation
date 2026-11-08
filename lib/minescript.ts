// A MineScript nyilvános belépési pontja a felület számára: a programfájl kiterjesztése, a beépített
// példaprogramok (lib/examples.ts) és a szintaktikai ellenőrzés. Maga az elemzés a lib/syntax/ mappában van
// (analyzeSource), egyetlen közös menetben a futtatható program előállításával.

import { fileBaseName, fileNameWith } from "./file-names";
import { analyzeSource } from "./syntax";
import type { SyntaxIssue } from "./diagnostics";

export { KEYWORDS, TOKEN_PATTERNS, isBooleanLiteral, isIdentifier } from "./syntax";
export type { Diagnostic, SyntaxCode, SyntaxIssue } from "./diagnostics";
export { EXAMPLES } from "./examples";

/** A programfájlok kiterjesztése (importnál és exportnál). */
export const PROGRAM_EXTENSION = ".mine";
/** A szerkeszthető programnév: kiterjesztés nélkül (az importált .txt-t is levágja), tiltott jelek nélkül. */
export const programName = (text: string) => fileBaseName(text, [PROGRAM_EXTENSION, ".txt"]);

/** A letöltött program neve: mindig .mine kiterjesztéssel, üres névnél „untitled.mine”. */
export const programFilename = (name: string) => fileNameWith(name, PROGRAM_EXTENSION);

/** Minden szintaktikai hiba soronként, oszloponként rendezve. Típusokat nem ellenőriz: azok futáskor derülnek ki. */
export function validateMineScript(source: string): SyntaxIssue[] {
  return analyzeSource(source).issues;
}
