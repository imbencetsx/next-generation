// A MineScript példaprogramjai és szintaktikai ellenőrzése.

export const KEYWORDS = [
  "and", "by", "else", "false", "forward", "here", "if", "isThere",
  "mine", "not", "or", "print", "set", "step", "to", "true", "turn", "while",
];
const reserved = new Set(KEYWORDS.map((word) => word.toLowerCase()));
const operators = new Set(["+", "-", "*", "=", "<>", "<", "<=", ">", ">=", "and", "or"]);

export const EXAMPLES = [
  {
    name: "Collect gold",
    filename: "collect-gold.mine",
    description: "Walk forward and collect gold until a wall is detected.",
    code: `set count to 0
set wall to isThere 1
set moving to not wall
while moving
  set gold to isThere 2
  if gold
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set wall to isThere 1
  set moving to not wall
print count`,
  },
  {
    name: "First steps",
    filename: "first-steps.mine",
    description: "A few simple commands to get familiar with MineScript.",
    code: `set distance to 3
step forward distance
turn by 1
set gold to isThere 2
if gold
  step forward 1
  mine here
else
  print false`,
  },
  {
    name: "Variables & logic",
    filename: "variables.mine",
    description: "Try integer values, boolean values, and a while loop.",
    code: `set count to 0
set running to true
while running
  set count to count + 1
  set running to count < 5
print count
set complete to count = 5
print complete`,
  },
];

export type SyntaxIssue = { line: number; column: number; message: string };
export function isIdentifier(token: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(token) && !reserved.has(token.toLowerCase());
}

function isSimpleValue(token: string | undefined): boolean {
  if (!token) return false;
  if (token === "true" || token === "false") return true;
  if (/^\d+$/.test(token)) return Number(token) <= 100;
  return isIdentifier(token);
}

function isExpression(tokens: string[]): boolean {
  switch (tokens.length) {
    case 1:
      return isSimpleValue(tokens[0]);
    case 2:
      return ["not", "isThere"].includes(tokens[0]) && isSimpleValue(tokens[1]);
    case 3:
      return isSimpleValue(tokens[0]) && operators.has(tokens[1]) && isSimpleValue(tokens[2]);
    default:
      return false;
  }
}

// Itt csak a nyelvtant ellenőrizzük; a típushibák és a hiányzó változók futáskor derülnek ki.
export function validateMineScript(source: string): SyntaxIssue[] {
  if (!source) return [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  // A fájl végi egyetlen sortörést nem tekintjük üres programsornak.
  if (lines.at(-1) === "") lines.pop();
  const issues: SyntaxIssue[] = [];
  const levels = [0];
  const previousAtLevel = new Map<number, string>();
  let previousCommand = "";
  let previousIndent = 0;

  lines.forEach((line, index) => {
    const indent = line.match(/^ */)![0].length;
    const text = line.slice(indent);
    function report(message: string) {
      issues.push({ line: index + 1, column: indent + 1, message });
    }
    if (!text) {
      report("Empty lines are not allowed inside a program.");
      return;
    }
    if (line.includes("\t")) {
      report("Use spaces instead of tabs.");
      return;
    }
    if (/  | $/.test(text)) {
      report("Separate tokens with exactly one space; remove trailing spaces.");
      return;
    }

    const tokens = text.split(" ");
    const command = tokens[0];
    if (indent > previousIndent) {
      if (!["if", "while", "else"].includes(previousCommand)) {
        report("Only if, else, and while can start an indented block.");
      }
      levels.push(indent);
    } else {
      while (levels.length > 1 && indent < levels.at(-1)!) {
        levels.pop();
      }
      if (indent !== levels.at(-1)) report("Indentation must match an existing block level.");
    }
    for (const level of previousAtLevel.keys()) {
      if (level > indent) previousAtLevel.delete(level);
    }
    if (index === 0 && indent !== 0) report("The first instruction must start without indentation.");
    if (command === "else" && previousAtLevel.get(indent) !== "if") {
      report("Align else with its matching if, directly after the if block.");
    }

    const hasValueAt = (index: number) => isSimpleValue(tokens[index]);
    switch (command) {
      case "step":
        if (tokens.length !== 3 || tokens[1] !== "forward" || !hasValueAt(2)) report("Expected: step forward <value>.");
        break;
      case "turn":
        if (tokens.length !== 3 || tokens[1] !== "by" || !hasValueAt(2)) report("Expected: turn by <value>.");
        break;
      case "mine":
        if (tokens.length !== 2 || tokens[1] !== "here") report("Expected: mine here.");
        break;
      case "print":
      case "if":
      case "while":
        if (tokens.length !== 2 || !hasValueAt(1)) report(`Expected: ${command} <value>. Use a variable, boolean, or integer from 0 to 100.`);
        break;
      case "else":
        if (tokens.length !== 1) report("else does not take a value.");
        break;
      case "set": {
        if (!tokens[1] || !isIdentifier(tokens[1])) {
          report("Use a variable name starting with a letter. Keywords are reserved in every letter case.");
          break;
        }
        if (tokens[2] !== "to") {
          report("Expected: set <name> to <expression>.");
          break;
        }
        if (!isExpression(tokens.slice(3))) {
          report("Expected a value, isThere <value>, not <value>, or <value> <operator> <value>.");
        }
        break;
      }
      default:
        report(`Unknown instruction “${command}”. Keywords are case-sensitive.`);
    }
    previousAtLevel.set(indent, command);
    previousCommand = command;
    previousIndent = indent;
  });
  return issues;
}
