// Egyszerű értékek (simpleval): változónév, 0–100 közötti egész vagy logikai literál.
// Itt dől el, mi számít egyetlen értéknek, és mit javaslunk, ha valami értéknek látszik, de nem az.

import { quote } from "../diagnostics";
import { MAX_NUMBER_LITERAL } from "../limits";
import { joined, type LineContext } from "./line-context";
import type { Operand } from "./program";
import type { Token } from "./scanner";
import {
  OPERATOR_SET,
  RESERVED_WORDS,
  isBooleanLiteral,
  isIdentifier,
  isNumberLiteral,
  isOperatorLike,
} from "./vocabulary";

function toOperand(token: Token): Operand {
  const at = { column: token.column, endColumn: token.end };
  if (isNumberLiteral(token.text)) return { kind: "int", value: Number(token.text), ...at };
  if (isBooleanLiteral(token.text)) return { kind: "bool", value: token.text === "true", ...at };
  return { kind: "var", name: token.text, ...at };
}

/** Hibás feltétel helyére kerül, hogy a blokkszerkezet a hiba ellenére is felépüljön. */
export const placeholderOperand = (token: Token): Operand => ({
  kind: "bool",
  value: false,
  column: token.column,
  endColumn: token.end,
});

/** Egy egyszerű érték: változó, 0–100 közötti egész vagy logikai literál. `where` a hibaüzenethez kell. */
export function parseValue(ctx: LineContext, token: Token, where: string): Operand | null {
  const text = token.text;
  if (isBooleanLiteral(text)) return toOperand(token);
  if (isNumberLiteral(text)) {
    if (Number(text) <= MAX_NUMBER_LITERAL) return toOperand(token);
    ctx.fail(
      "S_NUMBER_RANGE",
      token,
      token,
      `The number ${quote(text)} is too large: number literals must be between 0 and ${MAX_NUMBER_LITERAL}.`,
      "Compute larger values with arithmetic, e.g. set big to 100 * 2.",
    );
    return null;
  }
  if (isIdentifier(text)) return toOperand(token);

  const lower = text.toLowerCase();
  let message = `${quote(text)} is not a valid value ${where}.`;
  let hint: string | undefined = "A value is a variable name, a whole number from 0 to 100, true or false.";
  if (isBooleanLiteral(lower)) {
    message = `${quote(text)} is not a value: boolean literals are written in lowercase.`;
    hint = `Write ${lower}.`;
  } else if (RESERVED_WORDS.has(lower)) {
    message = `${quote(text)} is a keyword and cannot be used as a value ${where}.`;
  } else if (/^-\d+$/.test(text)) {
    message = `Negative number literals like ${quote(text)} do not exist.`;
    hint = `Compute it instead: set n to 0 - ${text.slice(1)}`;
  } else if (/^\d/.test(text)) {
    message = `${quote(text)} is neither a number nor a name: numbers contain only digits and names must start with a letter.`;
  } else if (isOperatorLike(text)) {
    message = `Expected a value ${where}, but found the operator ${quote(text)}.`;
  } else if (/[A-Za-z0-9][+\-*=<>]|[+\-*=<>][A-Za-z0-9]/.test(text)) {
    // Szóközök nélkül írt művelet, pl. „x+1”.
    const spaced = text
      .replace(/(<>|<=|>=|[+\-*=<>])/g, " $1 ")
      .trim()
      .replace(/ +/g, " ");
    message = `${quote(text)} is not a single value.`;
    hint = `Put spaces around operators: ${spaced}`;
  }
  ctx.fail("S_INVALID_VALUE", token, token, message, hint);
  return null;
}

/** Olyan helyek, ahol csak egyetlen érték állhat: print, if, while, step forward, turn by. */
export function parseSingleValue(
  ctx: LineContext,
  keyword: Token,
  label: string,
  rest: Token[],
  example: string,
): Operand | null {
  if (rest.length === 0) {
    ctx.fail("S_MISSING_VALUE", keyword, keyword, `${label} is missing its value.`, `Write for example: ${example}`);
    return null;
  }

  const [first, second] = rest;
  const looksLikeExpression =
    (rest.length === 2 && (first.text === "not" || first.text === "isThere")) ||
    (rest.length === 3 && OPERATOR_SET.has(rest[1].text));
  if (looksLikeExpression) {
    const isCondition = label === "if" || label === "while";
    const variable = isCondition ? "ok" : label === "print" ? "value" : "n";
    const rewrite = `set ${variable} to ${joined(rest)}\n${label} ${variable}`;
    ctx.fail(
      "S_COMPLEX_VALUE",
      first,
      rest.at(-1)!,
      `${label} takes a single value, not the expression ${quote(joined(rest))}.`,
      `Compute it into a variable with set first:\n${rewrite}${label === "while" ? "\n(and update it again at the end of the loop body)" : ""}`,
    );
    return null;
  }

  const value = parseValue(ctx, first, `after ${label}`);
  if (value && second) {
    ctx.fail(
      "S_EXTRA_TOKENS",
      second,
      rest.at(-1)!,
      `Unexpected ${quote(second.text)} after ${quote(`${label} ${first.text}`)}: ${label} takes exactly one value.`,
      `Remove the extra part: ${label} ${first.text}`,
    );
    return null;
  }
  return value;
}
