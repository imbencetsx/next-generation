// Közös hibaleírások: a szintaktikai és a futásidejű hibák ugyanazt az alakot használják.
// A szerződés: docs/diagnostics.md.

export type SyntaxCode =
  | "S_EMPTY_LINE"
  | "S_TAB"
  | "S_SPACING"
  | "S_TRAILING_SPACE"
  | "S_INVALID_CHARACTER"
  | "S_UNKNOWN_INSTRUCTION"
  | "S_EXPECTED_KEYWORD"
  | "S_MISSING_VALUE"
  | "S_EXTRA_TOKENS"
  | "S_COMPLEX_VALUE"
  | "S_NUMBER_RANGE"
  | "S_INVALID_VALUE"
  | "S_RESERVED_NAME"
  | "S_INVALID_NAME"
  | "S_INVALID_EXPRESSION"
  | "S_UNKNOWN_OPERATOR"
  | "S_UNEXPECTED_INDENT"
  | "S_INDENT_MISMATCH"
  | "S_ELSE_WITHOUT_IF"
  | "S_ELSE_MISALIGNED"
  | "S_DUPLICATE_ELSE";

// A hibakódok a kiírás 2.2.4 és 3.4 fejezetéből.
export type ErrorCode =
  | "E_TYPE_MISMATCH"
  | "E_UNINITIALIZED"
  | "E_NON_BOOL_CONDITION"
  | "E_BAD_OPERAND"
  | "E_BEDROCK_HIT"
  | "E_NO_GOLD"
  | "E_BAD_ARG"
  | "INSTRUCTION_COUNT_LIMIT_EXCEEDED";

export type Related = { line: number; message: string };

export type Diagnostic = {
  code: SyntaxCode | ErrorCode;
  line: number;
  /** 1-től számozott oszlop, a hibás rész első karaktere. */
  column: number;
  /** A hibás rész utáni oszlop (kizáró); mindig nagyobb, mint `column`. */
  endColumn: number;
  message: string;
  hint?: string;
  related?: Related[];
};

export type SyntaxIssue = Diagnostic & { code: SyntaxCode };
export type RunError = Diagnostic & { code: ErrorCode };

export type Value = number | boolean;

export const typeWord = (value: Value) => (typeof value === "number" ? "integer" : "boolean");
export const withArticle = (value: Value) => (typeof value === "number" ? "an integer" : "a boolean");
export const quote = (text: string) => `“${text}”`;

/** Kiírásnál használt, 1-től számozott mezőhivatkozás. */
export const cellName = (x: number, y: number) => `row ${y + 1}, column ${x + 1}`;

/** Levenshtein-távolság a „talán erre gondoltál” javaslatokhoz. */
export function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

/** A legközelebbi jelölt, ha elég közel van ahhoz, hogy elírásnak tűnjön. */
export function closest(word: string, candidates: readonly string[], maxDistance = 2): string | null {
  let best: string | null = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of candidates) {
    const distance = editDistance(word.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
