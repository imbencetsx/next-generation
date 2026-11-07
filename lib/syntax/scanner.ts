// Első lépés: egy forrássor felbontása behúzásra és tokenekre.
// Itt derülnek ki a soron belüli formai hibák: üres sor, tabulátor, dupla vagy záró szóköz, tiltott karakter.

import type { Related, SyntaxCode, SyntaxIssue } from "../diagnostics";
import { describeInvalidCharacter } from "./character-hints";
import type { Span } from "./program";

/** Egy szóközök közötti szövegdarab; `column` 1-től számozott, `end` kizáró. */
export type Token = { text: string; column: number; end: number };

export type ScannedLine = {
  /** A behúzás hossza karakterekben. */
  indent: number;
  indentHasTab: boolean;
  tokens: Token[];
  /** A sorban tiltott karakter van, ezért a tartalmát nem elemezzük tovább. */
  invalid: boolean;
  /** A sor tartalma a behúzás és a záró szóközök nélkül. */
  span: Span;
};

/** A hibák gyűjtője: minden elemzési lépés ide jelenti a talált hibákat. */
export type Report = (issue: SyntaxIssue) => void;

/** Szintaktikai hiba összeállítása; a jelölt tartomány legalább egy karakter széles. */
export function syntaxIssue(
  code: SyntaxCode,
  line: number,
  column: number,
  endColumn: number,
  message: string,
  hint?: string,
  related?: Related[],
): SyntaxIssue {
  const result: SyntaxIssue = { code, line, column, endColumn: Math.max(endColumn, column + 1), message };
  if (hint) result.hint = hint;
  if (related?.length) result.related = related;
  return result;
}

const isBlank = (char: string | undefined) => char === " " || char === "\t";

/** Egy forrássor beolvasása. Üres sornál null; a többi hibát jelenti, de a sort a lehető legtovább feldolgozza. */
export function scanLine(text: string, line: number, report: Report): ScannedLine | null {
  const lead = /^[ \t]*/.exec(text)![0];
  if (lead.length === text.length) {
    report(
      syntaxIssue(
        "S_EMPTY_LINE",
        line,
        1,
        Math.max(2, text.length + 1),
        text.length
          ? "This line is empty (it contains only whitespace). Empty lines are not allowed inside a program."
          : "Empty lines are not allowed inside a program.",
        "Delete the empty line.",
      ),
    );
    return null;
  }

  const tab = text.indexOf("\t");
  if (tab >= 0) {
    report(
      syntaxIssue(
        "S_TAB",
        line,
        tab + 1,
        tab + 2,
        tab < lead.length
          ? "The indentation contains a tab character. Indent with spaces only."
          : "A tab character is used between tokens. Use exactly one space.",
        "Replace the tab with spaces.",
      ),
    );
  }

  let contentEnd = text.length;
  while (contentEnd > 0 && isBlank(text[contentEnd - 1])) contentEnd--;
  const trailing = text.slice(contentEnd);
  if (trailing.includes(" ")) {
    report(
      syntaxIssue(
        "S_TRAILING_SPACE",
        line,
        contentEnd + 1,
        text.length + 1,
        `Remove the trailing space${trailing.length > 1 ? "s" : ""} at the end of the line.`,
      ),
    );
  }

  const tokens = splitTokens(text, lead.length, contentEnd, line, report);
  const invalid = reportFirstInvalidCharacter(tokens, line, report);

  return {
    indent: lead.length,
    indentHasTab: lead.includes("\t"),
    tokens,
    invalid,
    span: { line, column: lead.length + 1, endColumn: contentEnd + 1 },
  };
}

/** Tokenekre bontás szóközök és tabulátorok mentén; a több karakteres elválasztót soronként egyszer jelzi. */
function splitTokens(text: string, start: number, end: number, line: number, report: Report): Token[] {
  const tokens: Token[] = [];
  let spacingReported = false;

  for (let i = start; i < end;) {
    const tokenStart = i;
    while (i < end && !isBlank(text[i])) i++;
    tokens.push({ text: text.slice(tokenStart, i), column: tokenStart + 1, end: i + 1 });

    const gapStart = i;
    while (i < end && isBlank(text[i])) i++;
    const separator = text.slice(gapStart, i);
    if (!spacingReported && separator.length >= 2 && separator.includes(" ")) {
      spacingReported = true;
      report(
        syntaxIssue(
          "S_SPACING",
          line,
          gapStart + 1,
          i + 1,
          `Use exactly one space between tokens (found ${separator.length} whitespace characters).`,
        ),
      );
    }
  }
  return tokens;
}

/** Az első tiltott karakter jelzése a sorban. Igaz, ha talált ilyet. */
function reportFirstInvalidCharacter(tokens: Token[], line: number, report: Report): boolean {
  for (const token of tokens) {
    // Kódpontonként haladunk, hogy az emoji és hasonló karakterek egyben maradjanak.
    const chars = [...token.text];
    const offset = chars.findIndex((char) => !/^[A-Za-z0-9+\-*=<>]$/.test(char));
    if (offset < 0) continue;

    const char = chars[offset];
    const column = token.column + chars.slice(0, offset).join("").length;
    const { message, hint } = describeInvalidCharacter(char, token.text);
    report(syntaxIssue("S_INVALID_CHARACTER", line, column, column + char.length, message, hint));
    return true;
  }
  return false;
}
