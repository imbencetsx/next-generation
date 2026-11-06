# AGENTS.md — MineScript robot simulator

Read this whole file before changing anything. It is the shared brief for every agent working in this repo.

## 1. What we are building

A browser game for the **Dusza Árpád Országos Programozói Emlékverseny 2026/2027, I. forduló (web), 2026-11-06 → 2026-11-08**. The spec is the PDF *"Robotszimulátor Web.pdf"* (Hungarian). This file restates every rule from that PDF that matters for code; when this file and the PDF disagree, the PDF wins — except for the decisions in §6, which the user made explicitly.

A treasure-hunting robot walks a mine (a grid map). Players write programs in **MineScript**, a tiny line-based language, to steer it, find gold and mine it. Required features (PDF §3):

1. **Login & user management** — every run result belongs to a user; the app is only usable after login. The method (open registration or admin-created users) is our choice.
2. **Map editor** — set the size, place empty chamber / gold / wall / robot (with direction). Only valid maps can be saved. Import/export in the map file format (§4).
3. **Code editor** — write and edit MineScript, import/export program files. Code may be invalid while editing; it only has to be valid before running.
4. **Running** — only syntactically valid programs run. On start the map and robot reset. Execution is **slowed down** so movement is visible; the currently executing line is shown; `print` output goes to a console; the map shows the robot's position and direction and the **explored** cells (visited, or inspected by `isThere`) distinguished from unexplored ones. Mined gold does not need special marking. The app shows gold mined and the step count. A run can be stopped.
5. **Leaderboard** — after every run, store user, map, gold mined and steps (processed program lines). Per map: more gold ranks higher; equal gold → fewer steps ranks higher.

Submission must also include a short description (how to reach each feature, what is missing, what is extra, problems and solutions). Judging: correct behaviour, clear and good-looking UI, **accessibility**, readable code. A demo build must ship with a ready game environment (sample users, maps, programs).

## 2. Current state (2026-11-06)

| Area | Status | Where |
|---|---|---|
| Code editor (CodeMirror 6, highlighting, lint, autocomplete, import/export, examples) | done | `components/code-editor.tsx`, `components/workbench.tsx` |
| Syntax validator | done | `lib/minescript.ts` (`validateMineScript`) |
| Interpreter prototype (parser → statement tree → line-stepping machine) | prototype | `lib/interpreter.ts` |
| Map model + map file parser + built-in maps | done | `lib/robot-map.ts` |
| Simulator panel (playback, map, console, variables, fog) | basic | `components/simulator.tsx`, `components/use-simulation.ts` |
| Documentation site at `/docs/[slug]` (Hungarian, dark, runnable examples) | done | `app/docs/`, `components/docs/`, `lib/docs/` |
| Map editor, map export | planned | — |
| Auth, persistence (Drizzle ORM + SQLite), leaderboard with server re-run | planned | — |
| Fast conformance tests (Bun native runner) | done | `tests/`, `scripts/test-related.ts`, `docs/testing.md` |
| Browser / React playback integration tests | planned | — |

**Interpreter work is paused.** Do not add features to or change semantics in `lib/interpreter.ts` unless the user asks. Docs and UI may *use* it.

## 3. Stack, commands, conventions

- Next.js **16.4.5** (App Router, `cacheComponents: true`), React 19.3, TypeScript (strict), Tailwind CSS 4, Bun 1.3. Editor: CodeMirror 6. Icons: lucide-react. Planned DB: Drizzle ORM + SQLite.
- Use **bun**: `bun dev`, `bun run build`, `bun run lint`, `bunx tsc --noEmit`. Run lint + typecheck + build before handing work back.
- This is *not* the Next.js in your training data — read `node_modules/next/dist/docs/` first (see block at the end). With `cacheComponents`, `dynamicParams` does not exist; use `generateStaticParams` + `notFound()`. `params`/`searchParams` are Promises. `useSearchParams` needs a `<Suspense>` boundary.
- ESLint enforces React-compiler rules: no ref access during render (`react-hooks/refs`), no `setState` inside effects. Put ref reads in event handlers/effects.
- Language of text: **app UI is English** today; the **docs site is Hungarian**; code identifiers and this file are English. Application comments are Hungarian: keep them brief and natural, explain non-obvious decisions, and use short file or section headers where they help navigation. Avoid repetitive comments and narrating obvious code. Test comments may remain English. Interpreter error messages are English and carry the official error code.
- Commit messages for **this repository only** must be in Hungarian: write subjects and bodies in concise, natural Hungarian with correct accents. Preserve code identifiers, file paths, command names, and Conventional Commit prefixes such as `feat:`, `fix:`, and `docs:` unchanged. This convention applies to agent-written and T3 Code-generated commit messages; it does not change other projects or the languages used elsewhere in this repository.
- Keep the engine (`lib/`) free of React, DOM, DB and timers so it can run in the browser, in tests and on the server (leaderboard re-run) identically.
- Accessibility is graded: keyboard-operable controls, visible focus, never color alone (icons/text too), `prefers-reduced-motion`, screen-reader status text.

### Repo map

```
app/page.tsx                 editor + simulator workbench
app/docs/                    docs site: layout (dark), /docs → /docs/attekintes, [slug] pages
components/docs/pages/       one Hungarian content component per docs page
components/docs/example.tsx  runnable example card (runs the real engine, checks the expected result)
lib/docs/examples.ts         DOC_EXAMPLES catalogue: code + map + expected result for every docs example
lib/docs/nav.ts              docs page list (slug, title, description) — drives nav and static params
components/code-editor.tsx   CodeMirror wrapper: MineScript mode, lint, active/error line, read-only lock
components/workbench.tsx     page shell: header, editor, problems, reference, simulator
components/simulator.tsx     map grid, controls, stats, console, variables
components/use-simulation.ts map state, Machine instance, playback timer
lib/minescript.ts            KEYWORDS, EXAMPLES, validateMineScript (syntax only)
lib/interpreter.ts           parseProgram (statement tree), Machine (one line per step), error codes
lib/robot-map.ts             GameMap, DIRECTIONS, parseMap, MAP_PRESETS
tests/                       categorized PDF-backed conformance and simulation contracts
scripts/test-related.ts      targeted dependency-aware test runner (explicit task paths)
docs/minescript-language.md  standalone language reference for agent ingestion
docs/testing.md              test groups, commands, source mapping, performance discipline
```

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

## 7. Examples — good and bad

Verified against the current validator and interpreter. "Corridor" is the built-in map `3 10` with the row `>.@..@.@.#` (robot at the left facing east, gold at columns 3, 6, 8, wall at column 10).

### 7.1 Good programs

The PDF's main example — walk until a wall, mining all gold on the way (on Corridor: prints `3`, mines 3, 64 steps):

```
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

| Program | Result |
|---|---|
| `set arany to isThere 2` / `print arany` (PDF map) | prints `false`, 2 steps |
| `set arany to 1` / `set Arany to 2` / `print arany` / `print Arany` | `1`, `2` — case-sensitive names |
| `set x to 0 - 5` / `print x` | `-5` — computed values may leave 0–100 |
| `set x to 100 * 100` / `print x` | `10000` |
| `set x to true = false` / `print x` | `false` — equality works on booleans |
| `set a to false` / `if a` / `··set x to true + 1` / `print a` | `false` — the bad line never runs, so no error |
| `set a to true` / `if a` / `print 1` | `1` — empty then-block is allowed (D2) |
| `set a to true` / `if a` / `····print 1` / `if a` / `··print 2` | `1`, `2` — blocks may use different indent widths |
| `turn by 1` / `set fal to isThere 1` / `print fal` (Corridor) | `true` — turned left to face north, wall there |
| `step forward 3` / `print true` (Corridor) | robot passes gold at column 3 and leaves it |
| *(empty program)* | finishes, 0 steps |

(`··` = two spaces of indentation.)

### 7.2 Syntax errors (program must not run)

| Program | Why |
|---|---|
| `Set x to 1` | Keywords are case-sensitive. |
| `set x to isthere 2` | Must be `isThere`. |
| `set While to 1` / `set iSTHERE to 1` | Keywords are reserved in every letter case. |
| `set x to 101` | Literals must be 0–100. |
| `set x to 1 + 2 + 3` / `set x to (1)` | No chained operators, no parentheses. |
| `while i < 3` | `while`/`if` take a single `simpleval`. Compute into a variable first. |
| `set x  to 1` / `set x to 1 ` | Exactly one space between tokens, no trailing space. |
| tab before `print 1` | Tabs are forbidden. |
| `set x to 1`, empty line, `print x` | Empty lines are forbidden. |
| `set a to 1` / `··print a` | Only `if`, `else`, `while` open an indented block. |
| `if a` / `····print 1` / `··print 2` | Dedent must return to an existing block level. |
| `if a` / `··print 1` / `··else` / `··print 2` | `else` must align with its `if` (D1). |
| `jump 1`, `mine there`, `step 1` | Unknown instruction / wrong fixed keywords. |

Correct form of the `while i < 3` loop (prints `3`, **13** steps: 2 setup + 4 `while` checks + 3×2 body + 1 `print`):

```
set i to 0
set megy to i < 3
while megy
  set i to i + 1
  set megy to i < 3
print i
```

### 7.3 Runtime errors

| Program | Result |
|---|---|
| `set x to 1` / `set x to true` | `E_TYPE_MISMATCH` line 2 |
| `print y` | `E_UNINITIALIZED` line 1 |
| `set x to true or y` | `E_UNINITIALIZED` — no short-circuit |
| `set x to true + y` | `E_BAD_OPERAND` — first operand is checked before `y` is read |
| `set x to 1 = true` | `E_BAD_OPERAND` — equality of different types |
| `set x to true = y` | `E_UNINITIALIZED` — `=` reads both operands before comparing types |
| `set x to not 1` | `E_BAD_OPERAND` |
| `set n to 1` / `if n` | `E_NON_BOOL_CONDITION` line 2 |
| `step forward 20` (Corridor) | `E_BEDROCK_HIT` — robot stops in front of the wall at column 9 (D3) |
| `turn by 2` / `step forward 1` (Corridor) | `E_BEDROCK_HIT` — leaving the map |
| `mine here` (Corridor start) | `E_NO_GOLD` |
| `step forward 2` / `mine here` / `mine here` | 1 gold, then `E_NO_GOLD` line 3 |
| `turn by true` | `E_BAD_ARG` |
| `set w to 3` / `set x to isThere w` | `E_BAD_ARG` |
| `set n to 0 - 1` / `step forward n` | `E_BAD_ARG` — negative argument |
| `set r to true` / `while r` / `··set r to true` | `INSTRUCTION_COUNT_LIMIT_EXCEEDED` after 1000 lines |

### 7.4 Step counting

| Program | Steps |
|---|---|
| `set a to false` / `if a` / `··print 1` / `else` / `··print 2` | 4 (`else` counted because it ran) |
| `set a to true` / `if a` / `··print 1` / `else` / `··print 2` | 3 (`else` not counted) |
| `set i to 0` / `set lim to 83 * 4` / `set megy to i < lim` / `while megy` / `··set i to i + 1` / `··set megy to i < lim` | exactly 1000 → **finishes successfully** |
| same with `set lim to 37 * 9` (333) | `INSTRUCTION_COUNT_LIMIT_EXCEEDED` |

## 8. Documentation site (`/docs`)

- Hungarian, always dark, statically prerendered. Pages: `attekintes`, `nyelv`, `robot`, `terkepek`, `interpreter`, `hibak`, `dontesek`. Add a page by adding it to `lib/docs/nav.ts` and to the `CONTENT` map in `app/docs/[slug]/page.tsx`.
- **Every MineScript example in the docs comes from `DOC_EXAMPLES`** and is shown with `<Example id="…" />`. Each entry states its expected result (`ok` with output/steps/gold, `syntax` with line, or `runtime` with error code and line). The reader can run it; a green check means the engine agrees with the docs.
- When you add or change an example, or change engine behaviour, run every `DOC_EXAMPLES` entry through `runExample` + `matchesExpectation` and make sure all pass. A failing example means either the docs or the engine is wrong — find out which; don't just edit the expectation.
- "Megnyitás a szerkesztőben" opens `/?code=…&map=…`; the workbench reads these via `useSearchParams` (that is why `app/page.tsx` wraps it in `<Suspense>`).
- Keep `/docs/dontesek` and §6 of this file in sync.

## 9. Testing policy — targeted, fast, specification-driven

- Start with `docs/minescript-language.md` for the full language contract and `docs/testing.md` for the test catalogue. Tests use **Bun's native runner**, not Vitest; no Next server, DOM, database, timers, or browser is required for engine tests.
- **Run relevant tests, not every test by habit.** Use `bun run test:related -- <task-file> [task-file…]` to include transitive consumers. Pass files from the current task, not unrelated dirty files. Unknown dependencies must be mapped or tested explicitly; never silently skip them.
- Focused groups: `test:syntax`, `test:maps`, `test:parser`, `test:semantics`, `test:control`, `test:robot`, `test:limits`, `test:state`, `test:scenarios`, `test:docs`, `test:tooling`. Prefix with `bun run`. Narrow a specific file with `bun test ./tests/interpreter/errors.test.ts -t 'pattern'` when iterating.
- Validator changes affect syntax **and** interpreter/scenario/docs tests. Map model changes affect map tests **and** interpreter/scenario/docs consumers. Interpreter changes affect interpreter/scenario/docs tests. Docs fixtures affect `test:docs`. The selector encodes this dependency closure.
- **Full suite:** `bun test tests` once for a new/changed shared harness, test-runner/dependency configuration, broad engine changes, or release verification. Once it passes, rerun only affected groups unless new failures or changes justify broader checks.
- Add easy, boundary, and hard interacting cases for changed behavior. Assert exact output, error code and source line, processed-line count, robot position/direction, remaining/mined gold, and exploration where relevant. Include both successful and failing paths; do not pad counts with duplicate trivial tests.
- Derive expectations independently from the PDF / explicit project decisions, not from current engine output. No `eval`, JavaScript truthiness, short-circuit assumptions, familiar-language precedence, or automatic mining. Label D3–D7 provisional behavior. Do not make integer overflow beyond the specified range a new contract.
- Keep tests deterministic and bounded. Use the shared harness's 1002-call fuse so a broken 1000-line limit cannot hang the suite. No real sleeps, playback animation, network, or timing assertions. Final-state tests take one final snapshot; only trace tests copy intermediate states.
- When docs examples change, `bun run test:docs` must pass. It directly asserts every `DOC_EXAMPLES` expectation and checks the matcher with wrong outcomes. Never merely change an expectation to match a bug.
- Report the selected command, passing/failing count, and duration. Engine tests do **not** verify React rendering, playback timers, buttons, file inputs, responsive layout, accessibility, auth, persistence, or leaderboard writes. UI changes need the relevant UI verification too.
- Interpreter work is still paused: test-only tasks must not modify `lib/interpreter.ts`. Preserve and report a failing conformance test with its minimal reproducer; ask for implementation work separately.
- Lint, typecheck, and build requirements in §3 remain applicable to application/config changes. They are not part of the fast engine test loop.

## 10. Pitfalls — don't do these

- Don't compile MineScript to JavaScript or use `eval`/`new Function`.
- Don't short-circuit `and`/`or`, and don't change the operand check order (§5.4) — tests and the leaderboard depend on exact error codes.
- Don't reject type errors at parse time; types are run-time only.
- Don't count animation frames or cells moved as steps; count lines in the engine, never in the UI.
- Don't put game rules in React components; the UI only renders engine snapshots.
- Don't trust client-sent gold/steps for the leaderboard (planned): the server re-runs the program with the same engine on the stored map version.
- Don't overwrite a valid map or program with a failed import.
- Don't remove the Next.js agent block below; `next dev` re-adds it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
