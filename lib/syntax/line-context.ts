// Egy sor elemzésének közös állapota: a tokenek, a sor száma és az első talált hiba.
// A sorelemző részei (line-parser, values, expressions) ezen keresztül jelzik a hibát.

import type { SyntaxCode, SyntaxIssue } from "../diagnostics";
import type { Span } from "./program";
import { syntaxIssue, type Token } from "./scanner";

export class LineContext {
  /** A sor első hibája; null, ha a sor helyes. Soronként legfeljebb egy tartalmi hibát jelzünk. */
  problem: SyntaxIssue | null = null;

  constructor(
    readonly tokens: Token[],
    readonly line: number,
  ) {}

  /** Hiba a `from`–`to` tokenek között. Csak az elsőt őrizzük meg: a későbbiek többnyire annak következményei. */
  fail(code: SyntaxCode, from: Token, to: Token, message: string, hint?: string) {
    this.problem ??= syntaxIssue(code, this.line, from.column, to.end, message, hint);
  }

  /** Az egész sor tartalma (behúzás nélkül). */
  span(): Span {
    return { line: this.line, column: this.tokens[0].column, endColumn: this.tokens.at(-1)!.end };
  }
}

/** Tokenek visszaírása szöveggé a hibaüzenetekhez és javaslatokhoz. */
export const joined = (tokens: Token[]) => tokens.map((token) => token.text).join(" ");
