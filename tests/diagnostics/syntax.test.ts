import { describe, expect, test } from "bun:test";
import { validateMineScript } from "../../lib/minescript";
import { parseProgram } from "../../lib/interpreter";

// Az alábbi oszlopok kézzel számoltak, 1-től indulnak, a vég kizáró.
type Expected = {
  code: string;
  line: number;
  column: number;
  endColumn: number;
  words?: string[];
  hints?: string[];
  related?: number[];
};
const issue = (
  code: string,
  column: number,
  endColumn: number,
  words: string[] = [],
  hints: string[] = [],
  line = 1,
  related?: number[],
): Expected => ({ code, line, column, endColumn, words, hints, related });
function check(source: string, expected: Expected[]) {
  const issues = validateMineScript(source) as {
    code: string;
    line: number;
    column: number;
    endColumn: number;
    message: string;
    hint?: string;
    related?: { line: number }[];
  }[];
  expect(issues.map(({ code, line, column, endColumn }) => ({ code, line, column, endColumn }))).toEqual(
    expected.map(({ code, line, column, endColumn }) => ({ code, line, column, endColumn })),
  );
  issues.forEach((actual, i) => {
    for (const word of expected[i].words ?? []) expect(actual.message.toLowerCase()).toContain(word.toLowerCase());
    for (const word of expected[i].hints ?? []) expect(actual.hint?.toLowerCase()).toContain(word.toLowerCase());
    if (expected[i].related) {
      expect((actual as { related?: { line: number }[] }).related?.map((r) => r.line)).toEqual(expected[i].related);
    }
  });
  const parsed = parseProgram(source);
  expect(parsed.ok).toBe(expected.length === 0);
  if (!parsed.ok) expect(parsed.issues as unknown).toEqual(issues);
}
const cases: [string, string, Expected[]][] = [
  ["S_EMPTY_LINE empty interior", "print 1\n\nprint 2", [issue("S_EMPTY_LINE", 1, 2, ["empty"], [], 2)]],
  ["S_EMPTY_LINE spaces only", "print 1\n   \nprint 2", [issue("S_EMPTY_LINE", 1, 4, ["empty"], [], 2)]],
  ["S_EMPTY_LINE second terminal newline (D5)", "print 1\n\n", [issue("S_EMPTY_LINE", 1, 2, ["empty"], [], 2)]],
  ["S_TAB inline separator", "print\t1", [issue("S_TAB", 6, 7, ["tab"])]],
  ["S_TAB first only", "\t\tprint 1", [issue("S_TAB", 1, 2, ["tab"])]],
  ["S_TAB indentation", "\tprint 1", [issue("S_TAB", 1, 2, ["tab"])]],
  ["S_TAB current block", "if true\n  print 1\n\tprint 2\n  print 3", [issue("S_TAB", 1, 2, ["tab"], [], 3)]],
  ["S_SPACING whole first run only", "print   1", [issue("S_SPACING", 6, 9, ["space"])]],
  [
    "S_SPACING independent content",
    "set x  to 101",
    [issue("S_SPACING", 6, 8, ["space"]), issue("S_NUMBER_RANGE", 11, 14, ["101", "100"])],
  ],
  ["S_SPACING two runs", "set  x  to 1", [issue("S_SPACING", 4, 6, ["space"])]],
  ["S_TRAILING_SPACE one", "print 1 ", [issue("S_TRAILING_SPACE", 8, 9, ["trailing"])]],
  ["S_TRAILING_SPACE run", "if true\n  print 1   ", [issue("S_TRAILING_SPACE", 10, 13, ["trailing"], [], 2)]],
  ["S_UNKNOWN_INSTRUCTION case", "Set x to 1", [issue("S_UNKNOWN_INSTRUCTION", 1, 4, ["Set"], ["set"])]],
  ["S_UNKNOWN_INSTRUCTION sensor", "isThere 1", [issue("S_UNKNOWN_INSTRUCTION", 1, 8, ["isThere"], ["set"])]],
  ["S_UNKNOWN_INSTRUCTION omitted set", "x to 1", [issue("S_UNKNOWN_INSTRUCTION", 1, 2, ["x"], ["set"])]],
  ["S_UNKNOWN_INSTRUCTION equals", "x = 1", [issue("S_UNKNOWN_INSTRUCTION", 1, 2, ["x"], ["set"])]],
  ["S_UNKNOWN_INSTRUCTION close command", "prnt 1", [issue("S_UNKNOWN_INSTRUCTION", 1, 5, ["prnt"], ["print"])]],
  ["S_UNKNOWN_INSTRUCTION unrelated short", "zz 1", [issue("S_UNKNOWN_INSTRUCTION", 1, 3, ["zz"])]],
  [
    "S_EXPECTED_KEYWORD wrong forward",
    "step backward 1",
    [issue("S_EXPECTED_KEYWORD", 6, 14, ["forward"], ["turn by 2"])],
  ],
  ["S_EXPECTED_KEYWORD missing forward", "step", [issue("S_EXPECTED_KEYWORD", 1, 5, ["forward"])]],
  ["S_EXPECTED_KEYWORD by", "turn 1", [issue("S_EXPECTED_KEYWORD", 6, 7, ["by"])]],
  ["S_EXPECTED_KEYWORD missing by", "turn", [issue("S_EXPECTED_KEYWORD", 1, 5, ["by"])]],
  ["S_EXPECTED_KEYWORD here", "mine there", [issue("S_EXPECTED_KEYWORD", 6, 11, ["here"])]],
  ["S_EXPECTED_KEYWORD missing here", "mine", [issue("S_EXPECTED_KEYWORD", 1, 5, ["here"])]],
  ["S_EXPECTED_KEYWORD to", "set x = 1", [issue("S_EXPECTED_KEYWORD", 7, 8, ["to"], ["to"])]],
  ["S_EXPECTED_KEYWORD missing to", "set x", [issue("S_EXPECTED_KEYWORD", 5, 6, ["to"])]],
  ["S_EXTRA_TOKENS print", "print 1 2", [issue("S_EXTRA_TOKENS", 9, 10, ["2"])]],
  [
    "S_EXTRA_TOKENS mine trailing span",
    "mine here 1 2  ",
    [issue("S_EXTRA_TOKENS", 11, 14, ["1"]), issue("S_TRAILING_SPACE", 14, 16, ["trailing"])],
  ],
  ["S_EXTRA_TOKENS else", "if false\nelse true", [issue("S_EXTRA_TOKENS", 6, 10, ["true"], ["if", "else"], 2)]],
  ["S_EXTRA_TOKENS step", "step forward 1 2", [issue("S_EXTRA_TOKENS", 16, 17, ["2"])]],
  ["S_NUMBER_RANGE easy", "print 101", [issue("S_NUMBER_RANGE", 7, 10, ["101", "100"])]],
  ["S_NUMBER_RANGE leading zeros", "print 00101", [issue("S_NUMBER_RANGE", 7, 12, ["00101", "100"])]],
  ["S_RESERVED_NAME exact", "set while to 1", [issue("S_RESERVED_NAME", 5, 10, ["while"])]],
  ["S_RESERVED_NAME mixed case", "set iSTHERE to 1", [issue("S_RESERVED_NAME", 5, 12, ["iSTHERE"])]],
  ["S_INVALID_NAME starts digit", "set 1a to 1", [issue("S_INVALID_NAME", 5, 7, ["1a"])]],
  ["S_INVALID_NAME operator", "set a-b to 1", [issue("S_INVALID_NAME", 5, 8, ["a-b"])]],
  ["S_INVALID_EXPRESSION chain", "set x to 1 + 2 + 3", [issue("S_INVALID_EXPRESSION", 10, 19, [], ["set"])]],
  ["S_INVALID_EXPRESSION repeated unary", "set x to not not true", [issue("S_INVALID_EXPRESSION", 10, 22)]],
  ["S_INVALID_EXPRESSION sensor chain", "set x to isThere 1 + 1", [issue("S_INVALID_EXPRESSION", 10, 23)]],
  ["S_INVALID_EXPRESSION adjacent values", "set x to a b", [issue("S_INVALID_EXPRESSION", 10, 13)]],
  ["S_UNEXPECTED_INDENT first line", "  print 1", [issue("S_UNEXPECTED_INDENT", 1, 3, ["indent"])]],
  [
    "S_UNEXPECTED_INDENT recovery",
    "print 1\n  print 2\nprint 3\n  print 4",
    [
      issue("S_UNEXPECTED_INDENT", 1, 3, ["indent"], [], 2, [1]),
      issue("S_UNEXPECTED_INDENT", 1, 3, ["indent"], [], 4, [3]),
    ],
  ],
  [
    "S_INDENT_MISMATCH nested widths",
    "if true\n  if true\n      print 1\n    print 2",
    [issue("S_INDENT_MISMATCH", 1, 5, ["4", "0", "2", "6"], [], 4)],
  ],
  [
    "S_INDENT_MISMATCH dedent",
    "if true\n    print 1\n  print 2",
    [issue("S_INDENT_MISMATCH", 1, 3, ["2", "0", "4"], [], 3)],
  ],
  ["S_ELSE_WITHOUT_IF easy", "else", [issue("S_ELSE_WITHOUT_IF", 1, 5, ["if"])]],
  ["S_ELSE_WITHOUT_IF while", "while false\nelse", [issue("S_ELSE_WITHOUT_IF", 1, 5, ["if", "while"], [], 2)]],
  [
    "S_ELSE_WITHOUT_IF separated",
    "if true\n  print 1\nprint 2\nelse",
    [issue("S_ELSE_WITHOUT_IF", 1, 5, ["if"], [], 4, [1])],
  ],
  ["S_ELSE_MISALIGNED D1", "if true\n  print 1\n  else", [issue("S_ELSE_MISALIGNED", 3, 7, [], ["0"], 3, [1])]],
  [
    "S_ELSE_MISALIGNED nested",
    "if true\n  if false\n    print 1\n    else",
    [issue("S_ELSE_MISALIGNED", 5, 9, [], ["2"], 4, [2])],
  ],
  ["S_DUPLICATE_ELSE empty", "if true\nelse\nelse", [issue("S_DUPLICATE_ELSE", 1, 5, [], [], 3, [2])]],
  [
    "S_DUPLICATE_ELSE with bodies",
    "if true\n  print 1\nelse\n  print 2\nelse",
    [issue("S_DUPLICATE_ELSE", 1, 5, [], [], 5, [3])],
  ],
  [
    "S_INVALID_CHARACTER first only with whitespace",
    "print  (1)  ",
    [
      issue("S_SPACING", 6, 8, ["space"]),
      issue("S_INVALID_CHARACTER", 8, 9, ["("], ["parentheses"]),
      issue("S_TRAILING_SPACE", 11, 13, ["trailing"]),
    ],
  ],
  [
    "S_UNEXPECTED_INDENT independent content",
    "print 1\n  print 101",
    [issue("S_UNEXPECTED_INDENT", 1, 3, ["indent"], [], 2, [1]), issue("S_NUMBER_RANGE", 9, 12, ["101", "100"], [], 2)],
  ],
  [
    "ordering line then column and no content cascade",
    "Set  x to 101 \nprint (1)",
    [
      issue("S_UNKNOWN_INSTRUCTION", 1, 4, ["Set"], ["set"]),
      issue("S_SPACING", 4, 6, ["space"]),
      issue("S_TRAILING_SPACE", 14, 15, ["trailing"]),
      issue("S_INVALID_CHARACTER", 7, 8, ["("], ["parentheses"], 2),
    ],
  ],
];

describe("diagnostics syntax / easy, boundary and interacting cases", () => {
  for (const [name, source, expected] of cases) test(name, () => check(source, expected));
  for (const [source, start, end] of [
    ["print", 1, 6],
    ["if", 1, 3],
    ["while", 1, 6],
    ["step forward", 6, 13],
    ["turn by", 6, 8],
    ["set x to", 7, 9],
    ["set x to not", 10, 13],
    ["set x to isThere", 10, 17],
    ["set x to a +", 12, 13],
  ] as const) {
    test(`S_MISSING_VALUE ${source}`, () => check(source, [issue("S_MISSING_VALUE", start, end, ["missing"])]));
  }
  for (const [token, hints] of [
    ["#", ["comment"]],
    ["/", ["comment"]],
    ["!", ["<>", "not"]],
    ["&", ["and"]],
    ["|", ["or"]],
    [".", ["whole"]],
    ["(", ["parentheses"]],
    [")", ["parentheses"]],
    ["\u00a0", []],
  ] as const) {
    test(`S_INVALID_CHARACTER ${JSON.stringify(token)}`, () =>
      check(`print ${token}1`, [
        issue("S_INVALID_CHARACTER", 7, 8, [token === "\u00a0" ? "U+00A0" : token], [...hints]),
      ]));
  }
  for (const [token, end, hints] of [
    ["TRUE", 11, ["true"]],
    ["False", 12, ["false"]],
    ["-1", 9, ["0 - 1"]],
    ["0x10", 11, []],
    ["1e2", 10, []],
    ["1a", 9, []],
    ["to", 9, []],
    ["+", 8, []],
    ["a+b", 10, ["a + b"]],
  ] as const) {
    test(`S_INVALID_VALUE ${token}`, () =>
      check(`print ${token}`, [issue("S_INVALID_VALUE", 7, end, [token], [...hints])]));
  }
  for (const [op, end, hint] of [
    ["==", 14, "="],
    ["=>", 14, ">="],
    ["=<", 14, "<="],
    ["AND", 15, "and"],
    ["++", 14, ""],
  ] as const) {
    test(`S_UNKNOWN_OPERATOR ${op}`, () =>
      check(`set x to a ${op} b`, [issue("S_UNKNOWN_OPERATOR", 12, end, [op], hint ? [hint] : [])]));
  }
  for (const [source, start, end] of [
    ["if a < b", 4, 9],
    ["while not a", 7, 12],
    ["print isThere 1", 7, 16],
    ["step forward a + b", 14, 19],
    ["turn by not a", 9, 14],
  ] as const) {
    test(`S_COMPLEX_VALUE ${source}`, () => check(source, [issue("S_COMPLEX_VALUE", start, end, [], ["set"])]));
  }
  for (const [source, expected] of [
    ["if\n  print 1\nprint 2", [issue("S_MISSING_VALUE", 1, 3, ["missing"])]],
    ["while\n  print 1\nprint 2", [issue("S_MISSING_VALUE", 1, 6, ["missing"])]],
    ["if false\nelse true\n  print 1\nprint 2", [issue("S_EXTRA_TOKENS", 6, 10, ["true"], ["if"], 2)]],
    ["else\n  print 1\nprint 2", [issue("S_ELSE_WITHOUT_IF", 1, 5, ["if"])]],
  ] as [string, Expected[]][]) {
    test(`opener recovery ${JSON.stringify(source)}`, () => check(source, expected));
  }
  for (const source of [
    "",
    "print 0\n",
    "print 100\r\nprint true\r\n",
    "if true\nelse",
    "while false",
    "if true\n    print 1\nif false\n  print 2",
    "if false\n  print 1\nelse\n  print 2",
    "if true\n  if false\n  else\nelse",
    "print missing\nset x to true + 1",
  ]) {
    test(`valid ${JSON.stringify(source)}`, () => check(source, []));
  }
});
