// A MineScript szókészlete: kulcsszavak, utasítások, műveleti jelek és a névszabály (kiírás 2.1).

export const KEYWORDS = [
  "and",
  "by",
  "else",
  "false",
  "forward",
  "here",
  "if",
  "isThere",
  "mine",
  "not",
  "or",
  "print",
  "set",
  "step",
  "to",
  "true",
  "turn",
  "while",
];

/** A kulcsszavak kisbetűsen: változónévként semmilyen betűméretben nem használhatók. */
export const RESERVED_WORDS = new Set(KEYWORDS.map((word) => word.toLowerCase()));

/** Egy sor első tokenje ezek egyike lehet. */
export const COMMANDS = ["set", "step", "turn", "mine", "print", "if", "else", "while"] as const;

export const OPERATORS = ["+", "-", "*", "=", "<>", "<", "<=", ">", ">=", "and", "or"] as const;
export type Operator = (typeof OPERATORS)[number];
export const OPERATOR_SET = new Set<string>(OPERATORS);
/** A hibaüzenetekben felsorolt műveleti jelek. */
export const OPERATOR_LIST = OPERATORS.join(" ");

/**
 * A tokenek alakja (horgony nélkül, hogy a szerkesztő kiemelése is használhassa egy sor közepén).
 * A szó lehet kulcsszó vagy név; hogy melyik, azt a KEYWORDS dönti el.
 */
export const TOKEN_PATTERNS = {
  number: /\d+/,
  operator: /<>|<=|>=|[+*=<>-]/,
  word: /[a-zA-Z][a-zA-Z0-9]*/,
};
const wholeToken = (pattern: RegExp) => new RegExp(`^(?:${pattern.source})$`);
const WHOLE_NUMBER = wholeToken(TOKEN_PATTERNS.number);
const WHOLE_WORD = wholeToken(TOKEN_PATTERNS.word);

/** Érvényes változónév: betűvel kezdődik, csak angol betűt és számjegyet tartalmaz, és nem kulcsszó. */
export function isIdentifier(token: string): boolean {
  return WHOLE_WORD.test(token) && !RESERVED_WORDS.has(token.toLowerCase());
}

export const isNumberLiteral = (text: string) => WHOLE_NUMBER.test(text);
export const isBooleanLiteral = (text: string) => text === "true" || text === "false";

/** Csak műveleti jel karakterekből áll (pl. „==”, „=>”), akkor is, ha nem érvényes operátor. */
export const isOperatorLike = (text: string) => /^[+\-*=<>]+$/.test(text);

// Javaslatok a hibaüzenetekhez: más nyelvek szokásai és a MineScript megfelelőjük.

/** Hibajavaslatok, nem elfogadott aliasok: a helyettesítés lehet teljes utasítás vagy kiegészítendő kulcsszó. */
export const COMMAND_ALIASES: Record<string, string> = {
  move: "step forward 1",
  go: "step forward 1",
  walk: "step forward 1",
  forward: "step forward 1",
  rotate: "turn by 1",
  left: "turn by 1",
  right: "turn by 3",
  dig: "mine here",
  collect: "mine here",
  pick: "mine here",
  take: "mine here",
  elif: "else, then a nested if",
  elseif: "else, then a nested if",
  for: "while",
  repeat: "while",
  loop: "while",
  until: "while",
  let: "set",
  var: "set",
  const: "set",
  echo: "print",
  log: "print",
  write: "print",
  say: "print",
  output: "print",
};

/** Más nyelvek műveleti jelei; az and/or önmagára képezése a hibás betűméret (pl. AND) javításához kell. */
export const OPERATOR_FIXES: Record<string, string> = {
  "==": "=",
  "=>": ">=",
  "=<": "<=",
  "><": "<>",
  "and": "and",
  "or": "or",
};
