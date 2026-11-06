// A MineScript példaprogramjai és a szintaktikai ellenőrzés belépési pontja.
// Maga az elemzés a lib/syntax.ts-ben van, egyetlen közös menetben a futtatással.

import { analyzeSource } from "./syntax";
import type { SyntaxIssue } from "./diagnostics";

export { KEYWORDS, isIdentifier } from "./syntax";
export type { Diagnostic, SyntaxCode, SyntaxIssue } from "./diagnostics";

export const EXAMPLES = [
  {
    name: "Collect gold",
    filename: "collect-gold.mine",
    description: "Walk forward and collect gold until a wall is detected.",
    code: `set count to 0
set wall to isThere 1
set moving to not wall
while moving
  set gold to isThere 2
  if gold
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set wall to isThere 1
  set moving to not wall
print count`,
  },
  {
    name: "First steps",
    filename: "first-steps.mine",
    description: "A few simple commands to get familiar with MineScript.",
    code: `set distance to 3
step forward distance
turn by 1
set gold to isThere 2
if gold
  step forward 1
  mine here
else
  print false`,
  },
  {
    name: "Variables & logic",
    filename: "variables.mine",
    description: "Try integer values, boolean values, and a while loop.",
    code: `set count to 0
set running to true
while running
  set count to count + 1
  set running to count < 5
print count
set complete to count = 5
print complete`,
  },
];

/** Minden szintaktikai hiba soronként, oszloponként rendezve. Típusokat nem ellenőriz: azok futáskor derülnek ki. */
export function validateMineScript(source: string): SyntaxIssue[] {
  return analyzeSource(source).issues;
}
