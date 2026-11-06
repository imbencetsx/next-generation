# MineScript diagnostics contract

How the engine reports problems in a program. This is a contract for the engine
(`lib/`), the UI and the tests. Language semantics are defined by the PDF and
`docs/minescript-language.md`; this file only defines **how problems are reported**.
It never changes which programs are valid or what they do.

## Shape

Every problem — syntax or runtime — is a `Diagnostic`:

```ts
type Diagnostic = {
  code: SyntaxCode | ErrorCode;
  line: number;       // 1-based source line
  column: number;     // 1-based column of the first faulty character
  endColumn: number;  // 1-based, exclusive; always > column
  message: string;    // what is wrong; names the offending token/value
  hint?: string;      // how to fix it, ideally with corrected code
  related?: { line: number; message: string }[]; // other lines that explain it
};
type SyntaxIssue = Diagnostic & { code: SyntaxCode };
type RunError = Diagnostic & { code: ErrorCode };
```

- Columns count characters of the original line (a tab is one column). CRLF and a
  single terminal newline do not change line numbers.
- Token span = the token's characters. Statement span = from the first non-space
  character of the line to the end of its content (trailing spaces excluded).
- Messages are English sentences. Tokens and values are quoted with “ ” (or shown
  as code). Tests should check codes, spans and the listed key contents, not prose.
- Coordinates in messages are 1-based: `row R, column C` where R = y + 1, C = x + 1.
- Type words are exactly `integer` and `boolean`.

## Syntax diagnostics (`validateMineScript`, `parseProgram`)

`validateMineScript(source)` returns all syntax issues sorted by line, then column.
`parseProgram(source)` returns `{ ok: false, issues }` with exactly the same list
whenever it is non-empty. The whole program is checked, including skipped branches.
Only syntax is checked: types and missing variables are runtime matters.

### Per line, at most

- one `S_TAB` (first tab), one `S_SPACING` (first run), one `S_TRAILING_SPACE`;
- one `S_INVALID_CHARACTER` (first one) — when present, the instruction itself is
  not analysed further (no content diagnostic on that line);
- one structural diagnostic (indentation / else);
- one content diagnostic (the first problem found left to right).

Whitespace problems do not hide content problems: `set x  to 101` reports both
`S_SPACING` and `S_NUMBER_RANGE`.

### Codes

| Code | Trigger | Span | Key content |
|---|---|---|---|
| `S_EMPTY_LINE` | Line is empty or only spaces (not the single terminal newline). | column 1 to max(2, length + 1) | “empty” |
| `S_TAB` | A tab character anywhere in the line. | the tab | “tab” |
| `S_SPACING` | Two or more consecutive spaces after the indentation, before the end of content. | the whole space run | “space” |
| `S_TRAILING_SPACE` | Spaces after the last token. | the trailing run | “trailing” |
| `S_INVALID_CHARACTER` | A character other than `A–Z a–z 0–9`, space, tab, `+ - * = < >`. | that character | the character, or its `U+XXXX` code when invisible/non-ASCII whitespace; `#` and `/` hint that comments do not exist; `!` hints `<>`/`not`; `&`/`|` hint `and`/`or`; `.` hints whole numbers; `(`/`)` say there are no parentheses |
| `S_UNKNOWN_INSTRUCTION` | First token is not `set step turn mine print if else while`. | first token | the token. Hint: the correct keyword when it matches case-insensitively (`Set` → `set`); `set` when the token is `isThere` (`set x to isThere 1`) or when the next token is `to`/`=` (`x to 1` → `set x to 1`); a close command (edit distance ≤ 2, token length ≥ 3) otherwise |
| `S_EXPECTED_KEYWORD` | Fixed keyword missing or wrong: `step` without `forward`, `turn` without `by`, `mine` without `here`, `set <name>` without `to`. | the wrong token, or the last token when missing | the expected keyword (“forward”, “by”, “here”, “to”). `set x = 1` hints `to`; `step backward` hints `turn by 2` |
| `S_MISSING_VALUE` | A required value is absent: `print`, `if`, `while`, `step forward`, `turn by`, `set x to`, `set x to not`, `set x to isThere`, `set x to a +`. | the last token present | “missing” |
| `S_EXTRA_TOKENS` | Tokens after a complete instruction that are not a single-value expression: `print 1 2`, `mine here 1`, `else true`, `step forward 1 2`. | first extra token to end of content | the first extra token. `else <x>` hints nesting an `if` inside `else` |
| `S_COMPLEX_VALUE` | `if`, `while`, `print`, `step forward`, `turn by` followed by an expression (`a op b`, `not a`, `isThere a`) instead of one value. | the expression | hint contains `set` and a rewrite using a variable |
| `S_NUMBER_RANGE` | Digit-only literal whose value is > 100. | the token | the token and “100” |
| `S_INVALID_VALUE` | Token in a value position that is not an identifier, a 0–100 integer, `true` or `false`: `TRUE`, `-1`, `0x10`, `1e2`, `1a`, a keyword such as `to`, an operator such as `+`, glued `a+b`. | the token | the token. `TRUE`/`False` hint lowercase `true`/`false`; `-1` hints `0 - 1`; glued tokens hint the spaced form |
| `S_RESERVED_NAME` | `set` target is a keyword in any letter case. | the name | the name |
| `S_INVALID_NAME` | `set` target is not `letter {letter | digit}`. | the name | the name |
| `S_INVALID_EXPRESSION` | `set` right side is not one of: value · `isThere v` · `not v` · `v op v`. E.g. `1 + 2 + 3`, `not not true`, `isThere 1 + 1`, `a b`. | first right-side token to end of content | chains hint splitting into several `set` lines |
| `S_UNKNOWN_OPERATOR` | In `v ? v`, the middle token is not an operator but is made only of `+ - * = < >` or is `and`/`or` in another case. | the operator token | the token. `==` hints `=`; `=>` hints `>=`; `=<` hints `<=`; `AND` hints `and` |
| `S_UNEXPECTED_INDENT` | Line is indented deeper than its block, but the previous instruction is not `if`/`else`/`while` (or it is line 1). | columns 1 … indent + 1 | “indent”; `related` = the previous instruction line when there is one |
| `S_INDENT_MISMATCH` | Dedent to a width that is not an open block’s width. | columns 1 … indent + 1 | the actual width and the valid widths |
| `S_ELSE_WITHOUT_IF` | `else` not directly after an `if` block at the same indentation (and not one of the two cases below). | the `else` token | “if”; after a `while` says only `if` has `else`; when other lines separate it from an earlier `if`, `related` = that `if` |
| `S_ELSE_MISALIGNED` | `else` at the indentation of an `if`’s then-block, that `if` has no `else` yet, and the previous instruction is not an `if` (D1). | the `else` token | `related` = the `if` line; hint says how many spaces / which indentation to use |
| `S_DUPLICATE_ELSE` | The `if` directly before already has an `else`. | the `else` token | `related` = the first `else` line |

### Clarifications

- A line that contains only whitespace (spaces and/or tabs) gives only `S_EMPTY_LINE`.
- `S_SPACING` is reported for a separator of two or more whitespace characters that
  contains at least one space (a single tab separator gives only `S_TAB`).
- An `else` line that already has a structural diagnostic is not matched to an `if`
  (no extra `S_ELSE_*` diagnostic), but it still opens its block.
- A line with a content error still counts as an instruction of its block, so an
  `else` after it is reported as `S_ELSE_WITHOUT_IF` (the line separates it from the `if`).

- A tab between tokens acts as a separator: `print\t1` gives only `S_TAB`.
- `S_INDENT_MISMATCH` lists every block width that was open **before** the invalid
  dedent (widths 0, 2, 6 and a dedent to 4 → “0 or 2 or 6”).
- When the instruction limit stops the program, `step()` still returns a `StepEvent`
  for the rejected instruction (its line and kind, empty `path`).

### Indentation rules used for spans

- A tab in the indentation gives `S_TAB`, and the line is treated as being at the
  current block’s indentation (no extra structural diagnostic).
- An `if`/`while`/`else` line opens its block **even if the line has another
  error**, so its body is never reported as `S_UNEXPECTED_INDENT` (no cascades).
- After `S_UNEXPECTED_INDENT` the line is treated as part of the current block.

## Runtime diagnostics (`Machine`)

`snapshot().error` is a `RunError` (or `null`). Codes, lines, counting and stop
behaviour are unchanged from the PDF (§2.2.4, §3.4).

| Code | Span | Key content | Extra |
|---|---|---|---|
| `E_UNINITIALIZED` | the variable token | the variable name | hint names a defined variable that differs only in letter case, if any |
| `E_TYPE_MISMATCH` | the `set` target name | name, old type word, new type word, new value | `related` = line where the variable got its type |
| `E_BAD_OPERAND` | the operand that failed (left if left fails; right if right fails; right for `=`/`<>` type mismatch; operand of `not`) | operator, the operand’s value and its type word | |
| `E_NON_BOOL_CONDITION` | the condition token | `if` or `while`, the value | hint shows an explicit comparison (`<>` or `set`) |
| `E_BAD_ARG` | the argument token | `step forward` / `turn by` / `isThere`, and the value | |
| `E_BEDROCK_HIT` | statement | cells moved and cells requested (e.g. `2 of 5`), robot `row R, column C`, and either the blocking wall’s `row/column` or the map edge | hint mentions `isThere 1` |
| `E_NO_GOLD` | statement | robot `row R, column C` | `related` = the line that already mined this cell, if any |
| `INSTRUCTION_COUNT_LIMIT_EXCEEDED` | statement of the line that would be the 1001st | “1000” | `related` = the most-executed `while` line (ties → earliest line), if a `while` ran |

## Engine extras

- `snapshot().nextLine`: the line the next `step()` would process; `null` when the
  machine is not running.
- `step()` returns `null` when not running, otherwise a `StepEvent`:
  `{ line, kind, path, printed? }` where `kind` is the instruction kind
  (`set step turn mine print if else while`), `path` lists the cells
  `{ x, y }` the robot entered during this step in order (empty when it did not
  move; on `E_BEDROCK_HIT` only the cells actually entered), and `printed` is the
  console text added by `print`.
- `parseMap` failures keep `error` (a message containing `Line N` for row problems)
  and add `line` (1-based file line) when the problem is on a specific line.
