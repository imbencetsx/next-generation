// Közös hibaleírások: a szintaktikai és a futásidejű hibák ugyanazt az alakot használják.
// A szerződés: docs/diagnostics.md.

export const SYNTAX_CODES = [
  "S_EMPTY_LINE",
  "S_TAB",
  "S_SPACING",
  "S_TRAILING_SPACE",
  "S_INVALID_CHARACTER",
  "S_UNKNOWN_INSTRUCTION",
  "S_EXPECTED_KEYWORD",
  "S_MISSING_VALUE",
  "S_EXTRA_TOKENS",
  "S_COMPLEX_VALUE",
  "S_NUMBER_RANGE",
  "S_INVALID_VALUE",
  "S_RESERVED_NAME",
  "S_INVALID_NAME",
  "S_INVALID_EXPRESSION",
  "S_UNKNOWN_OPERATOR",
  "S_UNEXPECTED_INDENT",
  "S_INDENT_MISMATCH",
  "S_ELSE_WITHOUT_IF",
  "S_ELSE_MISALIGNED",
  "S_DUPLICATE_ELSE",
] as const;
export type SyntaxCode = (typeof SYNTAX_CODES)[number];

// A hibakódok a kiírás 2.2.4 és 3.4 fejezetéből.
export const ERROR_CODES = [
  "E_TYPE_MISMATCH",
  "E_UNINITIALIZED",
  "E_NON_BOOL_CONDITION",
  "E_BAD_OPERAND",
  "E_BEDROCK_HIT",
  "E_NO_GOLD",
  "E_BAD_ARG",
  "INSTRUCTION_COUNT_LIMIT_EXCEEDED",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

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

/** Darabszám angol többes számmal: plural(1, "space") → "1 space", plural(2, "space") → "2 spaces". */
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Kiírásnál használt, 1-től számozott mezőhivatkozás. */
export const cellName = (x: number, y: number) => `row ${y + 1}, column ${x + 1}`;
