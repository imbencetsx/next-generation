// Második lépés: egy sor tokenjeiből egy utasítás (a blokkszerkezet egy csomópontja).
// Soronként legfeljebb egy tartalmi hibát jelzünk, balról jobbra az elsőt; a javaslatok a gyakori
// tévedésekre (más nyelvek szokásai, betűméret, elírás) adnak konkrét, beírható javítást.
// Az értékek elemzése a values.ts-ben, a `set` jobb oldaláé az expressions.ts-ben van.

import { quote, type SyntaxIssue } from "../diagnostics";
import { closest } from "../suggest";
import { parseExpression } from "./expressions";
import { joined, LineContext } from "./line-context";
import type { Token } from "./scanner";
import type { Node } from "./tree";
import { parseSingleValue, placeholderOperand } from "./values";
import { COMMAND_ALIASES, COMMANDS, RESERVED_WORDS, isIdentifier, isNumberLiteral } from "./vocabulary";

/** Az else sorból nem lesz önálló csomópont: a blokkelemző párosítja a megelőző if-fel. */
export type ParsedLine = Node | { kind: "else"; token: Token } | null;

/** Egy sor elemzése: az utasítás (vagy null, ha hibás) és a sor első hibája. */
export function parseLine(tokens: Token[], line: number): { parsed: ParsedLine; problem: SyntaxIssue | null } {
  const ctx = new LineContext(tokens, line);
  const parsed = parseStatement(ctx);
  return { parsed, problem: ctx.problem };
}

function parseStatement(ctx: LineContext): ParsedLine {
  const [head] = ctx.tokens;
  const rest = ctx.tokens.slice(1);
  switch (head.text) {
    case "set":
      return parseSet(ctx);
    case "step":
      return parseMotion(ctx, "step", "forward");
    case "turn":
      return parseMotion(ctx, "turn", "by");
    case "mine":
      return parseMine(ctx);
    case "print": {
      const arg = parseSingleValue(ctx, head, "print", rest, "print count");
      return arg ? { kind: "print", span: ctx.span(), arg } : null;
    }
    case "if":
    case "while": {
      // Hibás feltételnél is megnyitjuk a blokkot, hogy a törzs sorait is ellenőrizni lehessen.
      const cond = parseSingleValue(ctx, head, head.text, rest, `${head.text} ready`) ?? placeholderOperand(head);
      return head.text === "if"
        ? { kind: "if", span: ctx.span(), indent: head.column - 1, cond, then: [] }
        : { kind: "while", span: ctx.span(), cond, body: [] };
    }
    case "else": {
      if (rest.length) {
        ctx.fail(
          "S_EXTRA_TOKENS",
          rest[0],
          rest.at(-1)!,
          `else takes no condition, but found ${quote(joined(rest))} after it.`,
          `For an “else if”, put an if inside the else block:\nelse\n  if ${rest.length === 1 ? rest[0].text : "ok"}`,
        );
      }
      return { kind: "else", token: head };
    }
  }
  reportUnknownInstruction(ctx, head);
  return null;
}

function reportUnknownInstruction(ctx: LineContext, head: Token) {
  const text = head.text;
  const lower = text.toLowerCase();
  const next = ctx.tokens[1]?.text;
  const message = `Unknown instruction ${quote(text)}.`;

  const sameLetters = COMMANDS.find((command) => command === lower);
  if (sameLetters) {
    return ctx.fail(
      "S_UNKNOWN_INSTRUCTION",
      head,
      head,
      `${message} Keywords are case-sensitive.`,
      `Write ${quote(sameLetters)} in lowercase.`,
    );
  }
  if (lower === "isthere") {
    const arg = ctx.tokens[1]?.text ?? "1";
    return ctx.fail(
      "S_UNKNOWN_INSTRUCTION",
      head,
      head,
      `isThere is a function, not an instruction: it can only be used on the right side of set.`,
      `Store its result in a variable: set found to isThere ${arg}`,
    );
  }
  if ((next === "to" || next === "=") && isIdentifier(text)) {
    return ctx.fail(
      "S_UNKNOWN_INSTRUCTION",
      head,
      head,
      message,
      `To assign a variable, start the line with set: set ${text} to ${joined(ctx.tokens.slice(2)) || "0"}`,
    );
  }
  if (RESERVED_WORDS.has(lower)) {
    return ctx.fail(
      "S_UNKNOWN_INSTRUCTION",
      head,
      head,
      `${quote(text)} cannot start an instruction.`,
      "Instructions start with set, step, turn, mine, print, if, else or while.",
    );
  }
  const alias = COMMAND_ALIASES[lower];
  if (alias) return ctx.fail("S_UNKNOWN_INSTRUCTION", head, head, message, `MineScript uses ${alias}.`);

  const near = text.length >= 3 ? closest(text, COMMANDS) : null;
  ctx.fail(
    "S_UNKNOWN_INSTRUCTION",
    head,
    head,
    message,
    near ? `Did you mean ${quote(near)}?` : "Instructions are: set, step, turn, mine, print, if, else, while.",
  );
}

/** `step forward <érték>` és `turn by <érték>`: a második szó rögzített kulcsszó. */
function parseMotion(ctx: LineContext, command: "step" | "turn", keyword: "forward" | "by"): Node | null {
  const [head, word] = ctx.tokens;
  const example = command === "step" ? "step forward 1" : "turn by 1";
  if (!word) {
    ctx.fail(
      "S_EXPECTED_KEYWORD",
      head,
      head,
      `Expected ${quote(keyword)} after ${command}.`,
      `Write for example: ${example}`,
    );
    return null;
  }
  if (word.text !== keyword) {
    ctx.fail(
      "S_EXPECTED_KEYWORD",
      word,
      word,
      `Expected ${quote(keyword)} after ${command}, but found ${quote(word.text)}.`,
      motionKeywordHint(ctx, command, keyword, word),
    );
    return null;
  }
  const arg = parseSingleValue(ctx, word, `${command} ${keyword}`, ctx.tokens.slice(2), example);
  return arg ? { kind: command, span: ctx.span(), arg } : null;
}

function motionKeywordHint(ctx: LineContext, command: "step" | "turn", keyword: "forward" | "by", word: Token): string {
  const lower = word.text.toLowerCase();
  if (lower === keyword) return `Keywords are case-sensitive: write ${keyword}.`;
  if (command === "step") {
    if (["backward", "backwards", "back"].includes(lower)) {
      return "The robot can only step forward. Turn around first with turn by 2, then step forward.";
    }
    if (lower === "left" || lower === "right") {
      return `Turn first (turn by ${lower === "left" ? 1 : 3}), then step forward.`;
    }
  } else {
    if (lower === "left") return "turn by 1 turns a quarter to the left.";
    if (lower === "right") return "There is only a left turn: turn by 3 equals a quarter turn to the right.";
    if (lower === "around") return "turn by 2 turns the robot around.";
  }
  // Ha a kulcsszó helyén már az érték áll („step 1”), azt tartjuk meg a javaslatban.
  const wordIsValue = ctx.tokens.length === 2 && (isNumberLiteral(word.text) || isIdentifier(word.text));
  const valueTokens = ctx.tokens.slice(wordIsValue ? 1 : 2);
  return `Write: ${command} ${keyword} ${joined(valueTokens) || "1"}`;
}

function parseMine(ctx: LineContext): Node | null {
  const [head, word, extra] = ctx.tokens;
  if (!word || word.text !== "here") {
    ctx.fail(
      "S_EXPECTED_KEYWORD",
      word ?? head,
      word ?? head,
      word
        ? `Expected ${quote("here")} after mine, but found ${quote(word.text)}.`
        : `Expected ${quote("here")} after mine.`,
      "Write: mine here. The robot can only mine the cell it is standing on.",
    );
    return null;
  }
  if (extra) {
    ctx.fail(
      "S_EXTRA_TOKENS",
      extra,
      ctx.tokens.at(-1)!,
      `Unexpected ${quote(extra.text)} after ${quote("mine here")}.`,
      "Write just: mine here",
    );
    return null;
  }
  return { kind: "mine", span: ctx.span() };
}

/** `set <név> to <kifejezés>` */
function parseSet(ctx: LineContext): Node | null {
  const [head, name, to] = ctx.tokens;
  if (!name) {
    ctx.fail(
      "S_MISSING_VALUE",
      head,
      head,
      "set is missing the variable name and value.",
      "Write for example: set count to 0",
    );
    return null;
  }
  if (RESERVED_WORDS.has(name.text.toLowerCase())) {
    ctx.fail(
      "S_RESERVED_NAME",
      name,
      name,
      `${quote(name.text)} is a reserved keyword (in every letter case) and cannot be a variable name.`,
      `Choose another name, e.g. ${quote(`${name.text.toLowerCase()}Value`)}.`,
    );
    return null;
  }
  if (!isIdentifier(name.text)) {
    ctx.fail(
      "S_INVALID_NAME",
      name,
      name,
      `${quote(name.text)} is not a valid variable name.`,
      "A name starts with a letter and contains only letters a–z, A–Z and digits.",
    );
    return null;
  }

  const rest = ctx.tokens.slice(3);
  if (!to) {
    ctx.fail(
      "S_EXPECTED_KEYWORD",
      name,
      name,
      `Expected ${quote("to")} after the variable name ${quote(name.text)}.`,
      `Write for example: set ${name.text} to 0`,
    );
    return null;
  }
  if (to.text !== "to") {
    const value = to.text === "=" ? joined(rest) : joined(ctx.tokens.slice(2));
    ctx.fail(
      "S_EXPECTED_KEYWORD",
      to,
      to,
      `Expected ${quote("to")} after ${quote(name.text)}, but found ${quote(to.text)}.`,
      to.text.toLowerCase() === "to"
        ? "Keywords are case-sensitive: write to."
        : `MineScript assigns with “to”: set ${name.text} to ${value || "0"}`,
    );
    return null;
  }

  const expr = parseExpression(ctx, to, rest);
  if (!expr) return null;
  const nameSpan = { line: ctx.line, column: name.column, endColumn: name.end };
  return { kind: "set", span: ctx.span(), name: name.text, nameSpan, expr };
}
