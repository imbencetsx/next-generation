// A teljes forráskód elemzése: soronként beolvassa és elemzi az utasításokat, a behúzásokból felépíti
// a blokkszerkezetet, és ha nincs hiba, lefordítja futtatható programmá.
// Hiba után is folytatjuk, hogy egyszerre minden hibát jelezni tudjunk, láncolt álhibák nélkül.

import type { SyntaxIssue } from "../diagnostics";
import { BlockStack, type Block, type PendingBlock, type PreviousLine } from "./block-stack";
import { compile } from "./compiler";
import { parseLine } from "./line-parser";
import { attachElse } from "./else-branch";
import type { Program, Span } from "./program";
import { scanLine, type Report, type Token } from "./scanner";
import type { IfNode, Node, WhileNode } from "./tree";
import { placeholderOperand } from "./values";

export type Analysis = { issues: SyntaxIssue[]; program: Program | null };

/** Minden szintaktikai hiba (sor és oszlop szerint rendezve), és ha nincs hiba, a futtatható program. */
export function analyzeSource(source: string): Analysis {
  const issues: SyntaxIssue[] = [];
  const report: Report = (found) => issues.push(found);
  const lines = source === "" ? [] : source.replace(/\r\n?/g, "\n").split("\n");
  // A fájl végi egyetlen sortörés nem üres programsor (D5).
  if (lines.at(-1) === "") lines.pop();

  const root: Node[] = [];
  const blocks = new BlockStack(root);
  let previous: PreviousLine | null = null;

  lines.forEach((text, index) => {
    const line = index + 1;
    const scan = scanLine(text, line, report);
    if (!scan) return;

    // A tabulátoros behúzást az aktuális blokkhoz soroljuk: a tabot már jeleztük, ne legyen belőle láncolt hiba.
    const indent = scan.indentHasTab ? blocks.current.indent : scan.indent;
    const indentIssue = blocks.enter(line, indent, previous);
    if (indentIssue) report(indentIssue);
    const structuralError = indentIssue !== null;
    const block = blocks.current;
    const head = scan.tokens[0];

    if (head.text === "else") {
      // Az else után álló felesleges részt is jelezzük (hibás karakter esetén azt már jeleztük).
      const problem = scan.invalid ? null : parseLine(scan.tokens, line).problem;
      if (problem) report(problem);
      // Tabulátoros behúzásnál a szint bizonytalan: párosítunk, de szerkezeti hibát nem jelzünk.
      const elseReport: Report = scan.indentHasTab ? () => {} : report;
      blocks.pending = attachElse(block, scan.span, head, structuralError, elseReport);
    } else if (scan.invalid) {
      // Hibás karakterrel is megtartjuk a blokknyitók szerkezetét.
      blocks.pending = keepStructure(block, head, scan.span);
    } else {
      const { parsed, problem } = parseLine(scan.tokens, line);
      if (problem) report(problem);
      const node = parsed as Node | null; // Az else ágat fent kezeltük.
      block.body.push(node ?? { kind: "invalid", span: scan.span });
      if (node?.kind === "if") blocks.pending = { body: node.then, kind: "if", owner: node };
      if (node?.kind === "while") blocks.pending = { body: node.body, kind: "while", owner: node };
    }

    previous = { line, text: text.slice(scan.span.column - 1, scan.span.endColumn - 1) };
  });

  issues.sort((a, b) => a.line - b.line || a.column - b.column);
  if (issues.length) return { issues, program: null };
  return { issues, program: { instructions: compile(root), lineCount: lines.length } };
}

/** Hibás karaktert tartalmazó sor: if és while esetén a blokkot így is megnyitjuk, hogy a törzs ellenőrizhető legyen. */
function keepStructure(block: Block, head: Token, span: Span): PendingBlock | null {
  if (head.text === "if") {
    const node: IfNode = { kind: "if", span, indent: head.column - 1, cond: placeholderOperand(head), then: [] };
    block.body.push(node);
    return { body: node.then, kind: "if", owner: node };
  }
  if (head.text === "while") {
    const node: WhileNode = { kind: "while", span, cond: placeholderOperand(head), body: [] };
    block.body.push(node);
    return { body: node.body, kind: "while", owner: node };
  }
  block.body.push({ kind: "invalid", span });
  return null;
}
