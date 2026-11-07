// A `set` jobb oldala (calculatedval): egy érték, `not érték`, `isThere érték` vagy `érték operátor érték`.
// Láncolt művelet, zárójel és beágyazás nincs; ezekre konkrét átírási javaslatot adunk.

import { quote } from "../diagnostics";
import { joined, type LineContext } from "./line-context";
import type { Expr } from "./program";
import type { Token } from "./scanner";
import { parseValue } from "./values";
import { OPERATOR_FIXES, OPERATOR_LIST, OPERATOR_SET, isOperatorLike, type Operator } from "./vocabulary";

/** A `set` jobb oldala: `érték`, `not érték`, `isThere érték` vagy `érték operátor érték` — semmi más. */
export function parseExpression(ctx: LineContext, to: Token, rest: Token[]): Expr | null {
  if (rest.length === 0) {
    ctx.fail(
      "S_MISSING_VALUE",
      to,
      to,
      `The value after ${quote("to")} is missing.`,
      "Write a value, isThere <value>, not <value> or <value> <operator> <value>.",
    );
    return null;
  }

  const [first, second, third] = rest;
  const isUnary = first.text === "not" || first.text === "isThere";

  if (rest.length === 1) {
    if (isUnary) {
      ctx.fail(
        "S_MISSING_VALUE",
        first,
        first,
        `${first.text} is missing its value.`,
        `Write for example: set x to ${first.text === "not" ? "not done" : "isThere 1"}`,
      );
      return null;
    }
    const operand = parseValue(ctx, first, "after “to”");
    return operand && { kind: "value", operand };
  }

  if (rest.length === 2) {
    if (isUnary) {
      const operand = parseValue(ctx, second, `after ${first.text}`);
      return operand && { kind: first.text as "not" | "isThere", operand };
    }
    return reportTwoTokenExpression(ctx, first, second, rest);
  }

  if (isUnary) {
    const doubled = first.text === "not" && second.text === "not";
    ctx.fail(
      "S_INVALID_EXPRESSION",
      first,
      rest.at(-1)!,
      doubled
        ? "not can only be applied to a single value; “not not” is not allowed."
        : `${first.text} takes exactly one value and cannot be combined with other parts (${quote(joined(rest))}).`,
      doubled
        ? `not not x is just x: set y to ${rest.at(-1)!.text}`
        : `Split it into separate set lines, e.g. set t to ${first.text} ${second.text}`,
    );
    return null;
  }

  if (rest.length === 3) {
    if (!OPERATOR_SET.has(second.text)) {
      reportUnknownOperator(ctx, first, second, third);
      return null;
    }
    const left = parseValue(ctx, first, `before ${quote(second.text)}`);
    if (!left) return null;
    const right = parseValue(ctx, third, `after ${quote(second.text)}`);
    return right && { kind: "binary", left, op: second.text as Operator, right };
  }

  // Négy vagy több token: láncolt művelet (pl. 1 + 2 + 3) vagy összefüggéstelen részek.
  const isChain = isAlternatingOperatorChain(rest);
  ctx.fail(
    "S_INVALID_EXPRESSION",
    first,
    rest.at(-1)!,
    `Only one operation is allowed per set line, but ${quote(joined(rest))} has ${isChain ? (rest.length - 1) / 2 : "several"} ${isChain ? "operations" : "parts"}.`,
    isChain
      ? `Split it into several set lines:\nset t to ${first.text} ${second.text} ${third.text}\nset x to t ${rest[3].text} ${rest[4]?.text ?? "…"}`
      : "Split the calculation into several set lines.",
  );
  return null;
}

/** Érték, operátor, érték, …; csak a sorrendet vizsgálja, az értékek érvényességét itt még nem. */
function isAlternatingOperatorChain(tokens: Token[]): boolean {
  if (tokens.length % 2 === 0) return false;
  return tokens.every((token, index) => {
    const isOperator = OPERATOR_SET.has(token.text);
    return index % 2 === 1 ? isOperator : !isOperator;
  });
}

/** Két token egyoperandusú művelet nélkül: hiányzó jobb oldal, rossz betűméret vagy hiányzó operátor. */
function reportTwoTokenExpression(ctx: LineContext, first: Token, second: Token, rest: Token[]): null {
  if (OPERATOR_SET.has(second.text) || isOperatorLike(second.text)) {
    if (!parseValue(ctx, first, "after “to”")) return null;
    ctx.fail(
      "S_MISSING_VALUE",
      second,
      second,
      `The operator ${quote(second.text)} is missing its right-hand value.`,
      `Write for example: set x to ${first.text} ${second.text} 1`,
    );
    return null;
  }
  const lower = first.text.toLowerCase();
  if (lower === "not" || lower === "isthere") {
    ctx.fail(
      "S_INVALID_EXPRESSION",
      first,
      second,
      `${quote(first.text)} must be written ${quote(lower === "not" ? "not" : "isThere")}: keywords are case-sensitive.`,
    );
    return null;
  }
  ctx.fail(
    "S_INVALID_EXPRESSION",
    first,
    second,
    `${quote(joined(rest))} is not a valid expression: two values need an operator between them.`,
    `Operators: ${OPERATOR_LIST}. Example: set x to ${first.text} + ${second.text}`,
  );
  return null;
}

function reportUnknownOperator(ctx: LineContext, first: Token, operator: Token, third: Token) {
  const lower = operator.text.toLowerCase();
  if (!isOperatorLike(operator.text) && lower !== "and" && lower !== "or") {
    ctx.fail(
      "S_INVALID_EXPRESSION",
      operator,
      operator,
      `${quote(operator.text)} is not an operator.`,
      `Operators: ${OPERATOR_LIST}`,
    );
    return;
  }
  const fix = OPERATOR_FIXES[lower];
  let hint = `Operators: ${OPERATOR_LIST}`;
  if (fix) {
    hint = `Use ${fix}: set x to ${first.text} ${fix} ${third.text}`;
  } else if (operator.text === "++" || operator.text === "--") {
    hint = `Write it as a normal operation, e.g. set x to x ${operator.text[0]} 1`;
  }
  ctx.fail("S_UNKNOWN_OPERATOR", operator, operator, `${quote(operator.text)} is not a MineScript operator.`, hint);
}
