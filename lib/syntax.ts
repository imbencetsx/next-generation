// MineScript forráskód elemzése: sorokra bontás, tokenizálás, blokkszerkezet és
// fordítás lapos utasításlistává. A szintaktikai ellenőrzés és a futtatható
// program ugyanebből az egy menetből készül, így a kettő nem térhet el egymástól.
// A hibák alakja: docs/diagnostics.md.

import { closest, quote, type Related, type SyntaxCode, type SyntaxIssue } from "./diagnostics";

export const KEYWORDS = [
  "and", "by", "else", "false", "forward", "here", "if", "isThere",
  "mine", "not", "or", "print", "set", "step", "to", "true", "turn", "while",
];
const RESERVED = new Set(KEYWORDS.map((word) => word.toLowerCase()));
const COMMANDS = ["set", "step", "turn", "mine", "print", "if", "else", "while"] as const;
export const OPERATORS = ["+", "-", "*", "=", "<>", "<", "<=", ">", ">=", "and", "or"] as const;
export type Operator = (typeof OPERATORS)[number];
const OPERATOR_SET = new Set<string>(OPERATORS);
const OPERATOR_LIST = "+ - * = <> < <= > >= and or";

export function isIdentifier(token: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(token) && !RESERVED.has(token.toLowerCase());
}

// ------------------------------------------------------------------ program types

export type Span = { line: number; column: number; endColumn: number };

export type Operand =
  | { kind: "int"; value: number; column: number; endColumn: number }
  | { kind: "bool"; value: boolean; column: number; endColumn: number }
  | { kind: "var"; name: string; column: number; endColumn: number };

export type Expr =
  | { kind: "value"; a: Operand }
  | { kind: "not"; a: Operand }
  | { kind: "isThere"; a: Operand }
  | { kind: "binary"; a: Operand; op: Operator; b: Operand };

export const END = -1;

/** Lapos utasítás: minden elem egy feldolgozható programsor, a mezők a következő utasítás indexét adják. */
export type Instruction =
  | { kind: "set"; span: Span; name: string; nameSpan: Span; expr: Expr; next: number }
  | { kind: "step" | "turn" | "print"; span: Span; arg: Operand; next: number }
  | { kind: "mine" | "else"; span: Span; next: number }
  | { kind: "if" | "while"; span: Span; cond: Operand; whenTrue: number; whenFalse: number };

export type Program = { readonly instructions: readonly Instruction[]; readonly lineCount: number };

// A blokkszerkezet a fordítás előtt.
type IfNode = { kind: "if"; span: Span; indent: number; cond: Operand; then: Node[]; else?: Node[]; elseSpan?: Span };
type WhileNode = { kind: "while"; span: Span; cond: Operand; body: Node[] };
type Node =
  | IfNode
  | WhileNode
  | { kind: "set"; span: Span; name: string; nameSpan: Span; expr: Expr }
  | { kind: "step" | "turn" | "print"; span: Span; arg: Operand }
  | { kind: "mine"; span: Span }
  | { kind: "invalid"; span: Span };

// ------------------------------------------------------------------ line scanning

type Token = { text: string; column: number; end: number };
type ScannedLine = { indent: number; indentHasTab: boolean; tokens: Token[]; invalid: boolean; span: Span };
type Report = (issue: SyntaxIssue) => void;

function issue(code: SyntaxCode, line: number, column: number, endColumn: number, message: string, hint?: string, related?: Related[]): SyntaxIssue {
  const result: SyntaxIssue = { code, line, column, endColumn: Math.max(endColumn, column + 1), message };
  if (hint) result.hint = hint;
  if (related?.length) result.related = related;
  return result;
}

const CHARACTER_NAMES: Record<string, string> = {
  " ": "non-breaking space",
  "​": "zero-width space",
  " ": "thin space",
  "　": "ideographic space",
  "﻿": "byte order mark",
};

function describeInvalidCharacter(char: string, token: string): { message: string; hint?: string } {
  const code = `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
  if (/\s/.test(char) || CHARACTER_NAMES[char] || char.codePointAt(0)! < 32) {
    return {
      message: `Invalid invisible character ${code}${CHARACTER_NAMES[char] ? ` (${CHARACTER_NAMES[char]})` : ""}.`,
      hint: "Only the normal space may separate tokens. Delete it and type a regular space.",
    };
  }
  const shown = `Invalid character ${quote(char)} (${code}).`;
  switch (char) {
    case "#": return { message: shown, hint: "MineScript has no comments. Remove the comment from the program." };
    case "/": return { message: shown, hint: token.startsWith("//") ? "MineScript has no comments. Remove the comment from the program." : "There is no division; the operators are + - and *." };
    case "!": return { message: shown, hint: "Use <> for “not equal” and not for negation, e.g. set open to not wall." };
    case "&": return { message: shown, hint: "Use and, e.g. set both to a and b." };
    case "|": return { message: shown, hint: "Use or, e.g. set either to a or b." };
    case ".": case ",": return { message: shown, hint: "Numbers are whole numbers from 0 to 100, without a decimal point." };
    case "(": case ")": return { message: shown, hint: "There are no parentheses. Split the calculation into several set lines." };
    case "[": case "]": case "{": case "}": return { message: shown, hint: "There are no brackets or braces. Blocks are marked by indentation." };
    case ":": return { message: shown, hint: "No colon is needed: the block after if, else or while is marked by indentation only." };
    case ";": return { message: shown, hint: "No semicolons: every instruction is on its own line." };
    case "\"": case "'": case "`": return { message: shown, hint: "There are no strings. print can only print integers and booleans." };
    case "%": case "^": return { message: shown, hint: "Only + - and * are available." };
    case "_": return { message: shown, hint: "Variable names may contain only letters and digits." };
  }
  if (/\p{L}/u.test(char)) {
    const ascii = token.normalize("NFD").replace(/\p{M}/gu, "");
    return {
      message: `Invalid character ${quote(char)} (${code}): names may only use the English letters a–z and A–Z and digits.`,
      hint: isIdentifier(ascii) ? `Write ${quote(ascii)} instead.` : undefined,
    };
  }
  return { message: shown };
}

function scanLine(text: string, line: number, report: Report): ScannedLine | null {
  const lead = /^[ \t]*/.exec(text)![0];
  if (lead.length === text.length) {
    report(issue("S_EMPTY_LINE", line, 1, Math.max(2, text.length + 1),
      text.length ? "This line is empty (it contains only whitespace). Empty lines are not allowed inside a program." : "Empty lines are not allowed inside a program.",
      "Delete the empty line."));
    return null;
  }

  const tab = text.indexOf("\t");
  if (tab >= 0) {
    report(issue("S_TAB", line, tab + 1, tab + 2,
      tab < lead.length ? "The indentation contains a tab character. Indent with spaces only." : "A tab character is used between tokens. Use exactly one space.",
      "Replace the tab with spaces."));
  }

  let contentEnd = text.length;
  while (contentEnd > 0 && (text[contentEnd - 1] === " " || text[contentEnd - 1] === "\t")) contentEnd--;
  const trailing = text.slice(contentEnd);
  if (trailing.includes(" ")) {
    report(issue("S_TRAILING_SPACE", line, contentEnd + 1, text.length + 1,
      `Remove the trailing space${trailing.length > 1 ? "s" : ""} at the end of the line.`));
  }

  const tokens: Token[] = [];
  let spacingReported = false;
  for (let i = lead.length; i < contentEnd;) {
    const start = i;
    while (i < contentEnd && text[i] !== " " && text[i] !== "\t") i++;
    tokens.push({ text: text.slice(start, i), column: start + 1, end: i + 1 });
    const gap = i;
    while (i < contentEnd && (text[i] === " " || text[i] === "\t")) i++;
    const separator = text.slice(gap, i);
    if (!spacingReported && separator.length >= 2 && separator.includes(" ")) {
      spacingReported = true;
      report(issue("S_SPACING", line, gap + 1, i + 1, `Use exactly one space between tokens (found ${separator.length} whitespace characters).`));
    }
  }

  let invalid = false;
  for (const token of tokens) {
    const offset = [...token.text].findIndex((char) => !/^[A-Za-z0-9+\-*=<>]$/.test(char));
    if (offset < 0) continue;
    const char = [...token.text][offset];
    const column = token.column + [...token.text].slice(0, offset).join("").length;
    const described = describeInvalidCharacter(char, token.text);
    report(issue("S_INVALID_CHARACTER", line, column, column + char.length, described.message, described.hint));
    invalid = true;
    break;
  }

  return {
    indent: lead.length,
    indentHasTab: lead.includes("\t"),
    tokens,
    invalid,
    span: { line, column: lead.length + 1, endColumn: contentEnd + 1 },
  };
}

// ------------------------------------------------------------------ instruction parsing

const operand = (token: Token): Operand => {
  const at = { column: token.column, endColumn: token.end };
  if (/^\d+$/.test(token.text)) return { kind: "int", value: Number(token.text), ...at };
  if (token.text === "true" || token.text === "false") return { kind: "bool", value: token.text === "true", ...at };
  return { kind: "var", name: token.text, ...at };
};
const placeholder = (token: Token): Operand => ({ kind: "bool", value: false, column: token.column, endColumn: token.end });
const joined = (tokens: Token[]) => tokens.map((token) => token.text).join(" ");
const isOperatorLike = (text: string) => /^[+\-*=<>]+$/.test(text);

const COMMAND_ALIASES: Record<string, string> = {
  move: "step forward 1", go: "step forward 1", walk: "step forward 1", forward: "step forward 1",
  rotate: "turn by 1", left: "turn by 1", right: "turn by 3",
  dig: "mine here", collect: "mine here", pick: "mine here", take: "mine here",
  elif: "else, then a nested if", elseif: "else, then a nested if",
  for: "while", repeat: "while", loop: "while", until: "while",
  let: "set", var: "set", const: "set",
  echo: "print", log: "print", write: "print", say: "print", output: "print",
};

/** Egy sor tartalmának elemzése. Legfeljebb egy tartalmi hibát jelez, balról jobbra az elsőt. */
class LineParser {
  problem: SyntaxIssue | null = null;
  constructor(private readonly tokens: Token[], private readonly line: number) {}

  fail(code: SyntaxCode, from: Token, to: Token, message: string, hint?: string) {
    this.problem ??= issue(code, this.line, from.column, to.end, message, hint);
  }

  /** Egy egyszerű érték (változó, 0–100 közötti egész vagy logikai literál) ellenőrzése. */
  value(token: Token, where: string): Operand | null {
    const text = token.text;
    if (text === "true" || text === "false") return operand(token);
    if (/^\d+$/.test(text)) {
      if (Number(text) <= 100) return operand(token);
      this.fail("S_NUMBER_RANGE", token, token, `The number ${quote(text)} is too large: number literals must be between 0 and 100.`,
        "Compute larger values with arithmetic, e.g. set big to 100 * 2.");
      return null;
    }
    if (isIdentifier(text)) return operand(token);

    const lower = text.toLowerCase();
    let message = `${quote(text)} is not a valid value ${where}.`;
    let hint: string | undefined = "A value is a variable name, a whole number from 0 to 100, true or false.";
    if (lower === "true" || lower === "false") {
      message = `${quote(text)} is not a value: boolean literals are written in lowercase.`;
      hint = `Write ${lower}.`;
    } else if (RESERVED.has(lower)) {
      message = `${quote(text)} is a keyword and cannot be used as a value ${where}.`;
    } else if (/^-\d+$/.test(text)) {
      message = `Negative number literals like ${quote(text)} do not exist.`;
      hint = `Compute it instead: set n to 0 - ${text.slice(1)}`;
    } else if (/^\d/.test(text)) {
      message = `${quote(text)} is neither a number nor a name: numbers contain only digits and names must start with a letter.`;
    } else if (isOperatorLike(text)) {
      message = `Expected a value ${where}, but found the operator ${quote(text)}.`;
    } else if (/[A-Za-z0-9][+\-*=<>]|[+\-*=<>][A-Za-z0-9]/.test(text)) {
      const spaced = text.replace(/(<>|<=|>=|[+\-*=<>])/g, " $1 ").trim().replace(/ +/g, " ");
      message = `${quote(text)} is not a single value.`;
      hint = `Put spaces around operators: ${spaced}`;
    }
    this.fail("S_INVALID_VALUE", token, token, message, hint);
    return null;
  }

  /** Olyan helyek, ahol csak egyetlen érték állhat: print, if, while, step forward, turn by. */
  single(keyword: Token, label: string, rest: Token[], example: string): Operand | null {
    if (rest.length === 0) {
      this.fail("S_MISSING_VALUE", keyword, keyword, `${label} is missing its value.`, `Write for example: ${example}`);
      return null;
    }
    const [first, second] = rest;
    const expression = (rest.length === 2 && (first.text === "not" || first.text === "isThere"))
      || (rest.length === 3 && OPERATOR_SET.has(rest[1].text));
    if (expression) {
      const condition = label === "if" || label === "while";
      const variable = condition ? "ok" : label === "print" ? "value" : "n";
      const rewrite = `set ${variable} to ${joined(rest)}\n${label} ${variable}`;
      this.fail("S_COMPLEX_VALUE", first, rest.at(-1)!, `${label} takes a single value, not the expression ${quote(joined(rest))}.`,
        `Compute it into a variable with set first:\n${rewrite}${label === "while" ? "\n(and update it again at the end of the loop body)" : ""}`);
      return null;
    }
    const value = this.value(first, `after ${label}`);
    if (value && second) {
      this.fail("S_EXTRA_TOKENS", second, rest.at(-1)!, `Unexpected ${quote(second.text)} after ${quote(`${label} ${first.text}`)}: ${label} takes exactly one value.`,
        `Remove the extra part: ${label} ${first.text}`);
      return null;
    }
    return value;
  }

  parse(): Node | { kind: "else"; token: Token } | null {
    const [head] = this.tokens;
    switch (head.text) {
      case "set": return this.set();
      case "step": return this.motion("step", "forward");
      case "turn": return this.motion("turn", "by");
      case "mine": return this.mine();
      case "print": {
        const arg = this.single(head, "print", this.tokens.slice(1), "print count");
        return arg ? { kind: "print", span: this.span(), arg } : null;
      }
      case "if": case "while": {
        const cond = this.single(head, head.text, this.tokens.slice(1), `${head.text} ready`) ?? placeholder(head);
        return head.text === "if"
          ? { kind: "if", span: this.span(), indent: head.column - 1, cond, then: [] }
          : { kind: "while", span: this.span(), cond, body: [] };
      }
      case "else": {
        const rest = this.tokens.slice(1);
        if (rest.length) {
          this.fail("S_EXTRA_TOKENS", rest[0], rest.at(-1)!, `else takes no condition, but found ${quote(joined(rest))} after it.`,
            `For an “else if”, put an if inside the else block:\nelse\n  if ${rest.length === 1 ? rest[0].text : "ok"}`);
        }
        return { kind: "else", token: head };
      }
    }
    this.unknown(head);
    return null;
  }

  private span(): Span {
    const tokens = this.tokens;
    return { line: this.line, column: tokens[0].column, endColumn: tokens.at(-1)!.end };
  }

  private unknown(head: Token) {
    const text = head.text;
    const next = this.tokens[1]?.text;
    const message = `Unknown instruction ${quote(text)}.`;
    const exact = COMMANDS.find((command) => command.toLowerCase() === text.toLowerCase());
    if (exact) {
      return this.fail("S_UNKNOWN_INSTRUCTION", head, head, `${message} Keywords are case-sensitive.`, `Write ${quote(exact)} in lowercase.`);
    }
    if (text.toLowerCase() === "isthere") {
      const arg = this.tokens[1]?.text ?? "1";
      return this.fail("S_UNKNOWN_INSTRUCTION", head, head, `isThere is a function, not an instruction: it can only be used on the right side of set.`,
        `Store its result in a variable: set found to isThere ${arg}`);
    }
    if ((next === "to" || next === "=") && isIdentifier(text)) {
      return this.fail("S_UNKNOWN_INSTRUCTION", head, head, message,
        `To assign a variable, start the line with set: set ${text} to ${this.tokens.slice(2).map((t) => t.text).join(" ") || "0"}`);
    }
    if (RESERVED.has(text.toLowerCase())) {
      return this.fail("S_UNKNOWN_INSTRUCTION", head, head, `${quote(text)} cannot start an instruction.`,
        "Instructions start with set, step, turn, mine, print, if, else or while.");
    }
    const alias = COMMAND_ALIASES[text.toLowerCase()];
    if (alias) return this.fail("S_UNKNOWN_INSTRUCTION", head, head, message, `MineScript uses ${alias}.`);
    const near = text.length >= 3 ? closest(text, COMMANDS) : null;
    this.fail("S_UNKNOWN_INSTRUCTION", head, head, message,
      near ? `Did you mean ${quote(near)}?` : "Instructions are: set, step, turn, mine, print, if, else, while.");
  }

  private motion(command: "step" | "turn", keyword: "forward" | "by"): Node | null {
    const [head, word] = this.tokens;
    const example = command === "step" ? "step forward 1" : "turn by 1";
    if (!word) {
      this.fail("S_EXPECTED_KEYWORD", head, head, `Expected ${quote(keyword)} after ${command}.`, `Write for example: ${example}`);
      return null;
    }
    if (word.text !== keyword) {
      const lower = word.text.toLowerCase();
      // Ha a kulcsszó helyén már az érték áll („step 1”), azt tartjuk meg a javaslatban.
      const valueTokens = /^\d+$/.test(word.text) || isIdentifier(word.text) ? this.tokens.slice(1) : this.tokens.slice(2);
      let hint = `Write: ${command} ${keyword} ${joined(valueTokens) || "1"}`;
      if (lower === keyword) hint = `Keywords are case-sensitive: write ${keyword}.`;
      else if (command === "step" && ["backward", "backwards", "back"].includes(lower)) hint = "The robot can only step forward. Turn around first with turn by 2, then step forward.";
      else if (command === "step" && (lower === "left" || lower === "right")) hint = `Turn first (turn by ${lower === "left" ? 1 : 3}), then step forward.`;
      else if (command === "turn" && lower === "left") hint = "turn by 1 turns a quarter to the left.";
      else if (command === "turn" && lower === "right") hint = "There is only a left turn: turn by 3 equals a quarter turn to the right.";
      else if (command === "turn" && lower === "around") hint = "turn by 2 turns the robot around.";
      this.fail("S_EXPECTED_KEYWORD", word, word, `Expected ${quote(keyword)} after ${command}, but found ${quote(word.text)}.`, hint);
      return null;
    }
    const arg = this.single(word, `${command} ${keyword}`, this.tokens.slice(2), command === "step" ? "step forward 1" : "turn by 1");
    return arg ? { kind: command, span: this.span(), arg } : null;
  }

  private mine(): Node | null {
    const [head, word, extra] = this.tokens;
    if (!word || word.text !== "here") {
      this.fail("S_EXPECTED_KEYWORD", word ?? head, word ?? head,
        word ? `Expected ${quote("here")} after mine, but found ${quote(word.text)}.` : `Expected ${quote("here")} after mine.`,
        "Write: mine here. The robot can only mine the cell it is standing on.");
      return null;
    }
    if (extra) {
      this.fail("S_EXTRA_TOKENS", extra, this.tokens.at(-1)!, `Unexpected ${quote(extra.text)} after ${quote("mine here")}.`, "Write just: mine here");
      return null;
    }
    return { kind: "mine", span: this.span() };
  }

  private set(): Node | null {
    const [head, name, to] = this.tokens;
    if (!name) {
      this.fail("S_MISSING_VALUE", head, head, "set is missing the variable name and value.", "Write for example: set count to 0");
      return null;
    }
    if (RESERVED.has(name.text.toLowerCase())) {
      this.fail("S_RESERVED_NAME", name, name, `${quote(name.text)} is a reserved keyword (in every letter case) and cannot be a variable name.`,
        `Choose another name, e.g. ${quote(`${name.text.toLowerCase()}Value`)}.`);
      return null;
    }
    if (!isIdentifier(name.text)) {
      this.fail("S_INVALID_NAME", name, name, `${quote(name.text)} is not a valid variable name.`,
        "A name starts with a letter and contains only letters a–z, A–Z and digits.");
      return null;
    }
    const rest = this.tokens.slice(3);
    if (!to) {
      this.fail("S_EXPECTED_KEYWORD", name, name, `Expected ${quote("to")} after the variable name ${quote(name.text)}.`, `Write for example: set ${name.text} to 0`);
      return null;
    }
    if (to.text !== "to") {
      const value = to.text === "=" ? joined(rest) : joined(this.tokens.slice(2));
      this.fail("S_EXPECTED_KEYWORD", to, to, `Expected ${quote("to")} after ${quote(name.text)}, but found ${quote(to.text)}.`,
        to.text.toLowerCase() === "to" ? "Keywords are case-sensitive: write to." : `MineScript assigns with “to”: set ${name.text} to ${value || "0"}`);
      return null;
    }
    const expr = this.expression(to, rest);
    return expr ? { kind: "set", span: this.span(), name: name.text, nameSpan: { line: this.line, column: name.column, endColumn: name.end }, expr } : null;
  }

  private expression(to: Token, rest: Token[]): Expr | null {
    if (rest.length === 0) {
      this.fail("S_MISSING_VALUE", to, to, `The value after ${quote("to")} is missing.`, "Write a value, isThere <value>, not <value> or <value> <operator> <value>.");
      return null;
    }
    const [first, second, third] = rest;
    const unary = first.text === "not" || first.text === "isThere";
    if (rest.length === 1) {
      if (unary) {
        this.fail("S_MISSING_VALUE", first, first, `${first.text} is missing its value.`, `Write for example: set x to ${first.text === "not" ? "not done" : "isThere 1"}`);
        return null;
      }
      const a = this.value(first, "after “to”");
      return a && { kind: "value", a };
    }
    if (rest.length === 2) {
      if (unary) {
        const a = this.value(second, `after ${first.text}`);
        return a && { kind: first.text as "not" | "isThere", a };
      }
      if (OPERATOR_SET.has(second.text) || isOperatorLike(second.text)) {
        if (!this.value(first, "after “to”")) return null;
        this.fail("S_MISSING_VALUE", second, second, `The operator ${quote(second.text)} is missing its right-hand value.`, `Write for example: set x to ${first.text} ${second.text} 1`);
        return null;
      }
      const lower = first.text.toLowerCase();
      if (lower === "not" || lower === "isthere") {
        this.fail("S_INVALID_EXPRESSION", first, second, `${quote(first.text)} must be written ${quote(lower === "not" ? "not" : "isThere")}: keywords are case-sensitive.`);
        return null;
      }
      this.fail("S_INVALID_EXPRESSION", first, second, `${quote(joined(rest))} is not a valid expression: two values need an operator between them.`,
        `Operators: ${OPERATOR_LIST}. Example: set x to ${first.text} + ${second.text}`);
      return null;
    }
    if (unary) {
      const doubled = first.text === "not" && second.text === "not";
      this.fail("S_INVALID_EXPRESSION", first, rest.at(-1)!,
        doubled ? "not can only be applied to a single value; “not not” is not allowed." : `${first.text} takes exactly one value and cannot be combined with other parts (${quote(joined(rest))}).`,
        doubled ? `not not x is just x: set y to ${rest.at(-1)!.text}` : `Split it into separate set lines, e.g. set t to ${first.text} ${second.text}`);
      return null;
    }
    if (rest.length === 3) {
      if (!OPERATOR_SET.has(second.text)) {
        const lower = second.text.toLowerCase();
        if (isOperatorLike(second.text) || lower === "and" || lower === "or") {
          const fixes: Record<string, string> = { "==": "=", "=>": ">=", "=<": "<=", "><": "<>", and: "and", or: "or" };
          const fix = fixes[lower];
          this.fail("S_UNKNOWN_OPERATOR", second, second, `${quote(second.text)} is not a MineScript operator.`,
            fix ? `Use ${fix}: set x to ${first.text} ${fix} ${third.text}` : second.text === "++" || second.text === "--"
              ? `Write it as a normal operation, e.g. set x to x ${second.text[0]} 1` : `Operators: ${OPERATOR_LIST}`);
        } else {
          this.fail("S_INVALID_EXPRESSION", second, second, `${quote(second.text)} is not an operator.`, `Operators: ${OPERATOR_LIST}`);
        }
        return null;
      }
      const a = this.value(first, `before ${quote(second.text)}`);
      if (!a) return null;
      const b = this.value(third, `after ${quote(second.text)}`);
      return b && { kind: "binary", a, op: second.text as Operator, b };
    }
    const chain = rest.length % 2 === 1 && rest.every((token, i) => (i % 2 === 1) === OPERATOR_SET.has(token.text));
    this.fail("S_INVALID_EXPRESSION", first, rest.at(-1)!,
      `Only one operation is allowed per set line, but ${quote(joined(rest))} has ${chain ? (rest.length - 1) / 2 : "several"} ${chain ? "operations" : "parts"}.`,
      chain
        ? `Split it into several set lines:\nset t to ${first.text} ${second.text} ${third.text}\nset x to t ${rest[3].text} ${rest[4]?.text ?? "…"}`
        : "Split the calculation into several set lines.");
    return null;
  }
}

// ------------------------------------------------------------------ block structure

type Block = { indent: number; body: Node[]; kind: "root" | "if" | "else" | "while"; owner: IfNode | WhileNode | null };
type Opener = Omit<Block, "indent">;

export type Analysis = { issues: SyntaxIssue[]; program: Program | null };

/** A teljes forráskód elemzése: minden szintaktikai hiba és – ha nincs hiba – a futtatható program. */
export function analyzeSource(source: string): Analysis {
  const issues: SyntaxIssue[] = [];
  const report: Report = (found) => issues.push(found);
  const lines = source === "" ? [] : source.replace(/\r\n?/g, "\n").split("\n");
  // A fájl végi egyetlen sortörés nem üres programsor.
  if (lines.at(-1) === "") lines.pop();

  const root: Node[] = [];
  const stack: Block[] = [{ indent: 0, body: root, kind: "root", owner: null }];
  let pending: Opener | null = null;
  let previous: { line: number; text: string } | null = null;

  lines.forEach((text, index) => {
    const line = index + 1;
    const scan = scanLine(text, line, report);
    if (!scan) return;

    // Behúzás: a tabulátoros behúzást az aktuális blokkhoz soroljuk, hogy ne legyen láncolt hiba.
    const indent = scan.indentHasTab ? stack.at(-1)!.indent : scan.indent;
    let structural = false;
    if (indent > stack.at(-1)!.indent) {
      if (pending) {
        stack.push({ indent, ...pending });
      } else {
        structural = true;
        report(previous
          ? issue("S_UNEXPECTED_INDENT", line, 1, indent + 1,
            `This line is indented by ${indent} space${indent === 1 ? "" : "s"}, but the previous instruction ${quote(previous.text)} (line ${previous.line}) does not open a block.`,
            "Only if, else and while can be followed by an indented block. Remove the extra indentation.",
            [{ line: previous.line, message: "previous instruction" }])
          : issue("S_UNEXPECTED_INDENT", line, 1, indent + 1, "The first line must not be indented.", "Remove the indentation so the line starts in column 1."));
      }
    } else {
      const widths = stack.map((block) => block.indent);
      while (stack.length > 1 && indent < stack.at(-1)!.indent) stack.pop();
      if (indent !== stack.at(-1)!.indent) {
        structural = true;
        report(issue("S_INDENT_MISMATCH", line, 1, indent + 1,
          `The indentation (${indent} space${indent === 1 ? "" : "s"}) does not match any open block. Valid indentations here: ${widths.join(" or ")} spaces.`,
          "Within a block every line must be indented the same way; when a block ends, go back to exactly the indentation of an outer block."));
      }
    }
    pending = null;
    const block = stack.at(-1)!;
    const span = scan.span;
    const head = scan.tokens[0];

    if (head.text === "else") {
      const parser = new LineParser(scan.tokens, line);
      if (!scan.invalid) parser.parse();
      if (parser.problem) report(parser.problem);
      pending = attachElse(block, span, head, structural, report);
    } else if (scan.invalid) {
      // Hibás karakterrel is megtartjuk a blokknyitók szerkezetét.
      pending = keepStructure(block, head, span);
    } else {
      const parser = new LineParser(scan.tokens, line);
      const node = parser.parse() as Node | null;
      if (parser.problem) report(parser.problem);
      if (node) {
        block.body.push(node);
        if (node.kind === "if") pending = { body: node.then, kind: "if", owner: node };
        if (node.kind === "while") pending = { body: node.body, kind: "while", owner: node };
      } else {
        block.body.push({ kind: "invalid", span });
      }
    }
    previous = { line, text: text.slice(span.column - 1, span.endColumn - 1) };
  });

  issues.sort((a, b) => a.line - b.line || a.column - b.column);
  if (issues.length) return { issues, program: null };
  return { issues, program: { instructions: compile(root), lineCount: lines.length } };
}

function keepStructure(block: Block, head: Token, span: Span): Opener | null {
  if (head.text === "if") {
    const node: IfNode = { kind: "if", span, indent: head.column - 1, cond: placeholder(head), then: [] };
    block.body.push(node);
    return { body: node.then, kind: "if", owner: node };
  }
  if (head.text === "while") {
    const node: WhileNode = { kind: "while", span, cond: placeholder(head), body: [] };
    block.body.push(node);
    return { body: node.body, kind: "while", owner: node };
  }
  block.body.push({ kind: "invalid", span });
  return null;
}

// Az else párosítása (D1: az else az if sorával egy szinten, közvetlenül a then-ág után).
function attachElse(block: Block, span: Span, token: Token, structural: boolean, report: Report): Opener {
  const orphan: Opener = { body: [], kind: "else", owner: null };
  if (structural) return orphan;
  const at = { line: span.line, column: token.column, end: token.end };
  const previous = block.body.at(-1);

  if (previous?.kind === "if") {
    if (previous.else) {
      report(issue("S_DUPLICATE_ELSE", at.line, at.column, at.end,
        `The if on line ${previous.span.line} already has an else (line ${previous.elseSpan!.line}). An if can have only one else.`,
        "Remove this else, or put a new if before it.",
        [{ line: previous.elseSpan!.line, message: "first else" }, { line: previous.span.line, message: "the if" }]));
      return orphan;
    }
    previous.else = [];
    previous.elseSpan = span;
    return { body: previous.else, kind: "else", owner: previous };
  }

  const owner = block.kind === "if" && block.owner?.kind === "if" && !block.owner.else ? block.owner : null;
  if (owner) {
    const width = owner.indent;
    report(issue("S_ELSE_MISALIGNED", at.line, at.column, at.end,
      `This else is indented like the body of the if on line ${owner.span.line}. An else must line up with its if.`,
      width === 0
        ? `Remove the indentation so else starts in column 1, like the if on line ${owner.span.line}.`
        : `Indent the else with ${width} space${width === 1 ? "" : "s"} (column ${width + 1}), exactly like the if on line ${owner.span.line}.`,
      [{ line: owner.span.line, message: "the if this else belongs to" }]));
    owner.else = [];
    owner.elseSpan = span;
    return { body: owner.else, kind: "else", owner };
  }

  if (previous?.kind === "while") {
    report(issue("S_ELSE_WITHOUT_IF", at.line, at.column, at.end,
      `else cannot follow the while loop on line ${previous.span.line}: only an if can have an else branch.`,
      "Code after a loop simply follows the loop body without else.",
      [{ line: previous.span.line, message: "the while loop" }]));
    return orphan;
  }
  const ifIndex = block.body.findLastIndex((node) => node.kind === "if" && !node.else);
  if (ifIndex >= 0) {
    const candidate = block.body[ifIndex] as IfNode;
    const between = block.body[ifIndex + 1];
    report(issue("S_ELSE_WITHOUT_IF", at.line, at.column, at.end,
      `else must directly follow its if block, but line ${between.span.line} stands between it and the if on line ${candidate.span.line}.`,
      `Move the else directly after the if block, or indent line ${between.span.line} into the if block.`,
      [{ line: candidate.span.line, message: "the nearest if without else" }]));
    return orphan;
  }
  report(issue("S_ELSE_WITHOUT_IF", at.line, at.column, at.end,
    "This else has no matching if: there is no if directly before it at the same indentation.",
    "Write else directly after an if block, at the same indentation as that if."));
  return orphan;
}

// ------------------------------------------------------------------ compilation

type Exit = (target: number) => void;

/** Lapos utasításlista: a vezérlés a `next`/`whenTrue`/`whenFalse` indexeken halad, veremre nincs szükség. */
function compile(root: Node[]): Instruction[] {
  const code: Instruction[] = [];

  function emitBlock(nodes: Node[]): { entry: number | null; exits: Exit[] } {
    let entry: number | null = null;
    let exits: Exit[] = [];
    for (const node of nodes) {
      const index = code.length;
      for (const exit of exits) exit(index);
      entry ??= index;
      exits = emit(node);
    }
    return { entry, exits };
  }

  function emit(node: Node): Exit[] {
    switch (node.kind) {
      case "invalid":
        throw new Error("compile() called with syntax errors");
      case "if": {
        const ins = { kind: "if" as const, span: node.span, cond: node.cond, whenTrue: END, whenFalse: END };
        code.push(ins);
        const then = emitBlock(node.then);
        const exits = [...then.exits];
        if (then.entry === null) exits.push((target) => { ins.whenTrue = target; });
        else ins.whenTrue = then.entry;
        if (node.else) {
          const marker = { kind: "else" as const, span: node.elseSpan!, next: END };
          ins.whenFalse = code.length;
          code.push(marker);
          const otherwise = emitBlock(node.else);
          if (otherwise.entry === null) exits.push((target) => { marker.next = target; });
          else marker.next = otherwise.entry;
          exits.push(...otherwise.exits);
        } else {
          exits.push((target) => { ins.whenFalse = target; });
        }
        return exits;
      }
      case "while": {
        const index = code.length;
        // Üres törzsnél a feltétel önmagára mutat: minden ellenőrzés egy feldolgozott sor (D2).
        const ins = { kind: "while" as const, span: node.span, cond: node.cond, whenTrue: index, whenFalse: END };
        code.push(ins);
        const body = emitBlock(node.body);
        if (body.entry !== null) ins.whenTrue = body.entry;
        for (const exit of body.exits) exit(index);
        return [(target) => { ins.whenFalse = target; }];
      }
      default: {
        const ins = { ...node, next: END } as Instruction & { next: number };
        code.push(ins);
        return [(target) => { ins.next = target; }];
      }
    }
  }

  const program = emitBlock(root);
  for (const exit of program.exits) exit(END);
  return code;
}
