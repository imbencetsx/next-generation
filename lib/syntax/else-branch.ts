// Az else ág párosítása és hibajavító feldolgozása. Az elemző a normál utasításokat külön kezeli.

import { plural, type Related, type SyntaxCode, type SyntaxIssue } from "../diagnostics";
import type { Block, PendingBlock } from "./block-stack";
import type { Span } from "./program";
import { syntaxIssue, type Report, type Token } from "./scanner";
import type { IfNode, Node } from "./tree";

type ElseIssue = (code: SyntaxCode, message: string, hint: string, related?: Related[]) => SyntaxIssue;

/**
 * Az else párosítása a megelőző if-fel (D1: az else az if sorával egy szinten áll, közvetlenül a then-ág után).
 * Mindig visszaad egy blokkot az else törzsének, hogy a hibás else alatti sorok is ellenőrizhetők legyenek.
 */
export function attachElse(
  block: Block,
  span: Span,
  token: Token,
  structuralError: boolean,
  report: Report,
): PendingBlock {
  const orphan: PendingBlock = { body: [], kind: "else", owner: null };
  if (structuralError) return orphan;
  // Minden else-hiba magát az else szót jelöli meg.
  const elseIssue: ElseIssue = (code, message, hint, related) =>
    syntaxIssue(code, span.line, token.column, token.end, message, hint, related);
  const previous = block.body.at(-1);

  // A szokásos eset: az else közvetlenül egy if blokkja után áll, ugyanazon a szinten.
  if (previous?.kind === "if") {
    if (previous.else) {
      report(
        elseIssue(
          "S_DUPLICATE_ELSE",
          `The if on line ${previous.span.line} already has an else (line ${previous.elseSpan!.line}). An if can have only one else.`,
          "Remove this else, or put a new if before it.",
          [{ line: previous.elseSpan!.line, message: "first else" }],
        ),
      );
      return orphan;
    }
    return bindElse(previous, span);
  }

  // Az else az if törzsének behúzásával áll: jelezzük, de az if-hez kötjük, hogy ne legyen láncolt hiba.
  const owner = block.kind === "if" && block.owner?.kind === "if" && !block.owner.else ? block.owner : null;
  if (owner) {
    report(misalignedElseIssue(owner, elseIssue));
    return bindElse(owner, span);
  }

  report(unmatchedElseIssue(block, previous, elseIssue));
  return orphan;
}

/** A normál és a helyreállított else is ugyanígy kapcsolódik az if-hez. */
function bindElse(owner: IfNode, span: Span): PendingBlock {
  owner.else = [];
  owner.elseSpan = span;
  return { body: owner.else, kind: "else", owner };
}

function misalignedElseIssue(owner: IfNode, elseIssue: ElseIssue): SyntaxIssue {
  const width = owner.indent;
  return elseIssue(
    "S_ELSE_MISALIGNED",
    `This else is indented like the body of the if on line ${owner.span.line}. An else must line up with its if.`,
    width === 0
      ? `Use 0 spaces of indentation (column 1) for the else, exactly like the if on line ${owner.span.line}.`
      : `Indent the else with ${plural(width, "space")} (column ${width + 1}), exactly like the if on line ${owner.span.line}.`,
    [{ line: owner.span.line, message: "the if this else belongs to" }],
  );
}

/** Itt már nincs párosítható if; a környezet alapján a leghasznosabb magyarázatot választjuk. */
function unmatchedElseIssue(block: Block, previous: Node | undefined, elseIssue: ElseIssue): SyntaxIssue {
  if (previous?.kind === "while") {
    return elseIssue(
      "S_ELSE_WITHOUT_IF",
      `else cannot follow the while loop on line ${previous.span.line}: only an if can have an else branch.`,
      "Code after a loop simply follows the loop body without else.",
      [{ line: previous.span.line, message: "the while loop" }],
    );
  }

  const ifIndex = block.body.findLastIndex((node) => node.kind === "if" && !node.else);
  if (ifIndex >= 0) {
    const candidate = block.body[ifIndex] as IfNode;
    const between = block.body[ifIndex + 1];
    return elseIssue(
      "S_ELSE_WITHOUT_IF",
      `else must directly follow its if block, but line ${between.span.line} stands between it and the if on line ${candidate.span.line}.`,
      `Move the else directly after the if block, or indent line ${between.span.line} into the if block.`,
      [{ line: candidate.span.line, message: "the nearest if without else" }],
    );
  }

  return elseIssue(
    "S_ELSE_WITHOUT_IF",
    "This else has no matching if: there is no if directly before it at the same indentation.",
    "Write else directly after an if block, at the same indentation as that if.",
  );
}
