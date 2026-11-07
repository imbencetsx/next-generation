# MineScript language and robot execution reference

This document is the ingestible language contract for the MineScript robot simulator.
It is written for developers, agents, and test authors. It does not describe JavaScript,
Python, or an extended version of MineScript.

## Authority and scope

1. Competition specification: **Robotszimulátor Web.pdf**, Dusza Árpád competition
   2026/2027, first web round, 2026-11-06–08. PDF sections are retained below.
2. Explicit user decisions **D1** and **D2** resolve the PDF's else inconsistency and
   confirm empty blocks. These override those ambiguous parts of the PDF.
3. **D3–D7 are provisional project choices**, not additional competition requirements.
   Tests for those choices are labeled. Ask before resolving any new ambiguity.
4. The Hungarian runnable guide lives at `/docs`; its examples are in
   `lib/docs/examples.ts`. The independent conformance tests live in `tests/`.

Keep this file, AGENTS.md §§4–6, and `/docs/dontesek` synchronized when a decision changes.
The PDF remains authoritative. Do not change expectations merely to match current code.

## Execution model at a glance

- Validate the entire program before running it, including code in skipped branches.
- Validation checks syntax only. Missing variables and operand types are runtime concerns.
- Each run begins with the original map, robot position/direction, all original gold,
  empty variables/output, zero mined gold, and zero processed lines.
- Run sequentially. A condition/loop decides which source line is processed next.
- A processed source line is one scoring step. It is not a robot movement unit.
- Stop at normal completion, a runtime error, the instruction limit, or a user stop.
- Show the current source line, console output, mined gold, processed lines, robot,
  direction, and explored cells. Slow playback belongs in the UI, not the engine.
- The initial map must remain available unchanged for the next run.

## Engine structure and diagnostics

- `lib/syntax/` is the only parser (`analyzeSource`). One pass scans lines, tokenizes, builds blocks
  (recovering from errors so one mistake does not cascade), and — only when there is
  no syntax error — compiles the blocks into a flat instruction list.
- `lib/interpreter.ts` runs that list with a program counter. `if`/`while` carry
  `whenTrue`/`whenFalse` targets, a taken `else` is its own counted instruction, and
  an empty `while` body points back to the `while` itself, so every condition check
  is one processed line. `step()` returns a `StepEvent` (cells entered, printed text).
- Every syntax and runtime problem is a coded `Diagnostic` with an exact column span,
  usually a hint, and related lines. The full contract is
  [diagnostics.md](diagnostics.md).

## Terminology

| Term | Meaning |
|---|---|
| Literal | A number or boolean written directly in source |
| Identifier | An ASCII variable name; created by successful `set` |
| Simple value (`simpleval`) | Exactly one identifier, integer literal, or boolean literal |
| Calculated value | A simple value, sensor call, unary operation, or one binary operation |
| Block | Zero or more instructions grouped by indentation |
| Processed line / scoring step | One executed instruction, condition check, or taken `else` marker |
| Movement cell | One intermediate robot position within a `step forward n` instruction |

## 4. File formats (PDF §1)

### Map file

```
3 15
....@..........
.#############.
.......@...>...
```

- Line 1: `<rows> <cols>` separated by exactly one space; each between **1 and 15**.
- Then exactly `rows` lines of exactly `cols` characters.
- `.` empty chamber (no robot, no gold) · `@` chamber with a gold nugget · `#` wall (impassable rock) · `>` `<` `^` `v` the robot facing east / west / north / south.
- **Exactly one robot**, and it stands in a chamber **without gold**.
- An invalid imported file must produce a clear error message and must **not** be loaded or crash the app. Never replace the current map/program with a broken import.

### Program file

Plain MineScript source. **The empty program is valid.**

## 5. MineScript — the language (PDF §2)

### 5.1 Grammar (EBNF, verbatim from the PDF)

```
programme     = { command }
command       = procedure | set | if | ifelse | while
procedure     = step | turn | mine | print
function      = isThere
step          = "step" "forward" simpleval
turn          = "turn" "by" simpleval
mine          = "mine" "here"
print         = "print" simpleval
isThere       = "isThere" simpleval
set           = "set" ident "to" calculatedval
if            = "if" simpleval block
ifelse        = "if" simpleval block "else" block
while         = "while" simpleval block
block         = { command }
calculatedval = simpleval | function | binop | unop
binop         = simpleval binoperator simpleval
unop          = unoperator simpleval
simpleval     = ident | number | boolean-lit
binoperator   = "+" | "-" | "*" | "=" | "<>" | "<" | "<=" | ">" | ">=" | "and" | "or"
unoperator    = "not"
boolean-lit   = "true" | "false"
ident         = letter { letter | digit }
number        = digit { digit }
letter        = "a".."z" | "A".."Z"
digit         = "0".."9"
```

### 5.2 Lexical rules

- Keywords **and** identifiers are **case-sensitive**: write `isThere`, not `isthere`; `arany` and `Arany` are different variables.
- Integer literals in source must be **0–100**. Computed values may be negative or larger than 100.
- Identifiers may not be a keyword **in any letter case**. Reserved words: `and, by, else, false, forward, here, if, isThere, mine, not, or, print, set, step, to, true, turn, while`.
- There are no nested expressions, no parentheses, no chained operators: every `simpleval` is a single token, and `set` has at most one operator.

### 5.3 Line processing / tokenization (PDF §2.1)

1. **One statement per line.** No semicolons or other separators.
2. **Indentation** (leading spaces) gives the block level and must be consistent within a block. It marks what belongs to an `if`/`while` body; when it decreases, the body ends. **Spaces only — tabs are not allowed.** Different blocks may use different indent widths, but within one block the width is uniform.
3. **Tokens are separated by exactly one space** (except the leading indentation). Double spaces and trailing spaces are errors. Never `trim().split(/\s+/)` — that hides errors the spec requires us to report.
4. The first token is the statement: `step, turn, mine, print, set, if, else, while`. Fixed keywords are fixed (`step forward …`, `turn by …`, `mine here`, `while …`, `set … to …`); the other tokens are `simpleval`s.
5. **No empty lines** in a program. (A single terminating newline at end of file is not an empty line — see §6.)
6. A syntactically invalid program **cannot run**; the UI must mark the faulty line.

### 5.4 Semantics (PDF §2.2)

- **Two types**: integer and boolean. **No implicit conversion.**
- **No declarations**: a variable is created by its first `set` and lives until the program ends (global scope).
- **Type locking**: the first assignment fixes the variable's type forever.
- `if`/`while` conditions must be boolean.
- **All type checks happen at run time.** A syntactically valid program must not be rejected because an unexecuted branch would fail.
- Statements run top to bottom; a block is the lines indented to the same depth.

Operators:

| Kind | Operators | Operands | Result |
|---|---|---|---|
| Arithmetic | `+ - *` | integer, integer | integer |
| Comparison | `< <= > >=` | integer, integer | boolean |
| Equality | `= <>` | both integer or both boolean | boolean |
| Logic | `and or` (binary), `not` (unary) | boolean | boolean |

`set x to value` evaluation order (this is observable through error codes):

1. Evaluate the right side **left to right**. Read the first operand and **immediately** check its type for the operator; stop at the first error.
2. Then read the second operand and check it. **No short-circuiting**: `true or c` still reads `c`.
3. For `=` / `<>` the first operand may be any type; the types are compared **after** reading the second operand.
4. On success, write to `x`: if `x` exists, the new value must have the same type.

`if`: runs the then-block or (if present) the else-block. `while`: repeats the body while the boolean condition is true.

### 5.5 Robot API (PDF §2.2.3)

| Call | Meaning |
|---|---|
| `step forward n` | Move `n` cells forward (`n` ≥ 0 integer), passing through the intermediate cells. Gold on cells it passes **stays there**. |
| `turn by n` | Turn `n` quarter-turns **left** (counter-clockwise). `n` ≥ 0. `0` = no change. |
| `mine here` | Mine the gold nugget on the robot's current cell; afterwards the cell has no more gold. |
| `isThere w` | Look at the cell **in front of** the robot. `w`: `0` empty chamber, `1` wall, `2` gold. Returns boolean. Beyond the map edge counts as **wall**. |
| `print x` | Write the integer or boolean `x` to the console. |

`n`, `w`, `x` are `simpleval`s (literal, boolean or variable).

### 5.6 Runtime errors (PDF §2.2.4)

Any of these stops the program; the UI shows the **code and the faulty line**.

| Code | When |
|---|---|
| `E_TYPE_MISMATCH` | Assigning a value of another type to an already typed variable. |
| `E_UNINITIALIZED` | Reading a variable before it was assigned. |
| `E_NON_BOOL_CONDITION` | `if`/`while` condition is not boolean. |
| `E_BAD_OPERAND` | Arithmetic/comparison on a non-integer, logic on a non-boolean, or `=`/`<>` with two different types. |
| `E_BEDROCK_HIT` | `step forward` would move onto a wall or off the map at its next cell. |
| `E_NO_GOLD` | `mine here` on a cell with no (or no more) gold. |
| `E_BAD_ARG` | API call with an out-of-range or wrong-type argument, e.g. `isThere 3`, `turn by true`, negative `step`. |
| `INSTRUCTION_COUNT_LIMIT_EXCEEDED` | The program wants to process line 1001 (see §5.7). |

### 5.7 Step counting and the 1000-line limit (PDF §3.4)

The leaderboard's **step count = processed program lines**, *not* cells moved. `step forward 5` is **1** step.

- Every executed line counts as 1.
- An `if` line counts once when its condition is evaluated.
- A `while` line counts **at every condition evaluation**, including the final `false` one and every jump back.
- An `else` line counts **only when the else branch runs** (the `if` condition was false).
- Body lines count again on every loop iteration.
- At most **1000** lines may be processed. A program that finishes right after its 1000th line **succeeds**; if it is about to process a 1001st line, stop with `INSTRUCTION_COUNT_LIMIT_EXCEEDED`.

## 6. Project decisions (spec gaps)

| # | Question | Decision | Status |
|---|---|---|---|
| D1 | The PDF text says `else` sits at the indent of the *if body*, but its example puts `else` at the indent of the *`if` line*. | **`else` aligns with its `if` line** and directly follows the then-block. | user decided 2026-11-06 |
| D2 | Can a block be empty (`if a` with no indented lines)? EBNF says `block = { command }`. | **Allowed.** `while r` with an empty body loops until the 1000-line limit. | user decided 2026-11-06 |
| D3 | `step forward 5` where the 3rd cell is a wall. | Robot moves the 2 free cells, then `E_BEDROCK_HIT` on that line. | provisional |
| D4 | What does `isThere 0` ("empty chamber") return on a gold cell? | `false` — a gold cell is not empty. `0` = inside the map, not a wall, no gold. | provisional |
| D5 | Trailing newline at end of file. | One terminal newline is ignored; any other blank line is a syntax error. | provisional |
| D6 | Range of computed integers. | JavaScript `number` (exact up to 2^53); no clamping. Only *literals* are limited to 0–100. | provisional, ask organizers |
| D7 | What counts as explored? | The start cell, every cell the robot enters, and the in-map cell inspected by `isThere`. | provisional |

When you hit a new gap: **do not guess silently.** Ask the user, then record the answer here.


## Valid programs with exact results

### The specification's collector

Map (10 columns, 3 rows):

```text
3 10
##########
>.@..@.@.#
##########
```

```text
set count to 0
set fal to isThere 1
set megy to not fal
while megy
  set arany to isThere 2
  if arany
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set fal to isThere 1
  set megy to not fal
print count
```

Expected: done, output `3`, mined `3`, processed lines `64`, final robot at
zero-based `(8, 1)` facing east. All original gold is gone. The full middle row,
including the wall inspected at its end, is explored. Other rows remain unexplored.

Independent count: for distance `d` and `g` mined nuggets this program processes
`5 + 7*d + g` lines. Here `d=8`, `g=3`, hence `64`.

### Counted loop

```text
set i to 0
set more to i < 3
while more
  set i to i + 1
  set more to i < 3
print i
```

Expected output: `3`; processed lines: **13** (2 setup + 4 condition checks +
6 body instructions + 1 final print). No robot movement occurs.

### Runtime error order

| Source | Result |
|---|---|
| `set x to true + missing` | `E_BAD_OPERAND`: invalid first operand wins |
| `set x to 1 + missing` | `E_UNINITIALIZED`: first operand is valid |
| `set x to true or missing` | `E_UNINITIALIZED`: no short-circuiting |
| `set x to false and missing` | `E_UNINITIALIZED`: no short-circuiting |
| `set x to true = missing` | `E_UNINITIALIZED`: equality reads the second operand |
| `set x to 1 = true` | `E_BAD_OPERAND`: equality requires matching types |
| `set x to not 0` | `E_BAD_OPERAND`: no truthiness conversion |

An assignment evaluates its RHS before checking the existing target type.
A failed assignment must not replace a previously assigned value.

## Syntax that other languages allow but MineScript forbids

- No comments, strings, arrays, functions, return statements, break, continue, or imports.
- No parentheses, chained operators, precedence rules, or nested expressions.
- No unary minus in source; compute a negative integer using `0 - n`.
- No comparison expression directly after `if` or `while`: assign it to a variable first.
- No inline `isThere` in a condition or `print`; assign its result first.
- No implicit integer/boolean coercion.
- No arbitrary whitespace normalization: tabs, doubled token spaces, and trailing spaces fail.
- Keyword recognition is case-sensitive; keyword reservation for variable names is not.
- No automatic mining while moving, no automatic reveal radius, no clockwise interpretation of `turn`.

## Deliberately unresolved or provisional areas

- Computed integer overflow beyond JavaScript's exact integer range is not settled by
  the PDF. D6 currently uses JavaScript `number` without clamping. Do not claim
  arbitrary precision, and do not make overflow/Infinity/NaN behavior normative in tests.
- D3 preserves successful partial motion before a collision. Tests explicitly label it.
- D4 distinguishes a chamber containing gold from an empty chamber.
- D5 ignores one terminal newline; it does not allow blank lines inside a program.
- D7 starts with the initial robot cell explored and marks only visited/inspected in-map cells.
- Persistence and ranking treatment of a user-stopped partial instruction still need
  their own specified contract before testing that behavior.

## Tests and coverage boundary

See [testing.md](testing.md) for targeted commands, test groups, and independent
oracles. Engine tests do not mount React, advance playback timers, drive file inputs,
check responsive layout/accessibility, or test the planned authentication/database/
leaderboard. Changes to those layers need their own relevant integration/UI tests.
