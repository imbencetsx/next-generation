# MineScript conformance tests

`bun run test` runs everything: the Bun-native engine suite (`bun run test:engine`, below)
and the Vitest app suite (`bun run test:app`).

## Profile and account tests

`bun run test:app` runs the separate Vitest suite: Convex functions in an
in-memory `convex-test` backend (edge runtime), and profile-page rendering in
English and Hungarian (Node). It checks ownership/session requirements, username
conflicts and sign-in consistency, current-password checks and rate limits,
password-change races, session revocation, and picture validation/replacement.
It does not access a deployed database or test browser file selection and cropping.
The engine suite below remains Bun-native and independent of this configuration.

## Running just what changed

Install with `bun install`. Tests use **Bun's native TypeScript test runner**; no
Vitest/Vite server, React renderer, DOM emulator, database, or browser is loaded.
`@types/bun` is development-only. Tests and scripts are outside the application graph.

Pass explicit task files to the dependency selector:

```sh
bun run test:related -- lib/interpreter.ts
bun run test:related -- lib/docs/examples.ts
bun run test:related -- tests/interpreter/robot.test.ts
```

The selector includes transitive consumers, removes overlapping paths, propagates
the test runner's exit code, and rejects unmapped files. It intentionally does **not**
scan the entire dirty working tree, since another task may have unrelated changes.
Unknown new modules need a dependency mapping or an explicit test group.

| Change / area | Focused command | Coverage |
|---|---|---|
| Lexical rules, grammar, indentation | `bun run test:syntax` | Valid/invalid source, exact faulty lines, every literal, reserved names, nested blocks |
| Map file format / dimensions / symbols | `bun run test:maps` | All 225 dimension pairs, four headings, malformed imports, PDF map |
| Parser / statement ownership | `bun run test:parser` | Syntax plus nested branch ownership, original line numbers and execution traces |
| Expressions, variables, errors | `bun run test:semantics` | Arithmetic matrix, comparisons, truth tables, every runtime code, precedence |
| Branches, loops, counting | `bun run test:control` | Exact traces, empty bodies, final false checks, 1000-line boundary |
| Robot API / simulation state | `bun run test:robot` | Motion, sensors, gold, fog, reset/isolation, full challenge programs |
| Instruction budget only | `bun run test:limits` | 999/1000/1001, empty loops, terminal error precedence |
| Reset, snapshots, independent machines | `bun run test:state` | State isolation, one-line stepping, terminal stability |
| Hard combined problems | `bun run test:scenarios` | Collector, algorithms, nested loops, 64 serpentine sweeps, symmetry |
| Docs examples and their expectations | `bun run test:docs` | Every DOC_EXAMPLES entry, negative expectation-matcher cases |
| Rich diagnostics and stepping | `bun run test:diagnostics` | Every syntax/runtime code, hand-counted spans, hints/related lines, recovery, nextLine, StepEvent, map error lines |
| Generated adversarial contracts | `bun run test:adversarial` | 4,000 fixed-seed malformed sources, independent AST tree walker across three maps, complete events/nextLine traces, recovery and limit boundaries |
| Test selection logic | `bun run test:tooling` | Dependency selection, deduplication, unknown-file guard |
| Interpreter broadly | `bun run test:interpreter` | All interpreter unit/contract groups |
| Full engine baseline | `bun test tests` | All of the above; use for broad changes, harness/config edits, releases |

A command can be narrowed further:

```sh
bun test ./tests/interpreter/errors.test.ts -t 'no truthiness'
bun test ./tests/scenarios/challenges.test.ts -t 'serpentine'
bun test ./tests/interpreter/limits.test.ts --watch
```

Use the related-file selector for changed production dependencies: changing the
validator affects the parser/interpreter/docs, not only standalone syntax tests.
`lib/syntax/` and `lib/diagnostics.ts` select the same syntax, engine and diagnostics
closure as `lib/minescript.ts`. Interpreter and map-model changes also include
`tests/diagnostics`; map changes additionally include map parsing tests.

A focused group is appropriate when investigating a specific behavior or editing
that test file. Changes confined to prose do not require a full engine run.

## Difficulty and specification sources

Tests are grouped by behavior and labeled easy, boundary, hard, adversarial, or
integration in their `describe` names. Difficulty is descriptive; it is not a timing
category. No random unseeded inputs or flaky duration assertions are used.

- **Easy:** valid commands, literals, arithmetic, boolean truth tables, cardinal motion.
- **Boundary:** all legal map sizes, invalid syntax, same-type equality, API arguments,
  zero-length motion, map edges, exact instruction limits.
- **Hard:** nested branch ownership and loops, operand error precedence, immutable
  starting maps, interleaved runs, repeated sensing/mining, exact source-line traces.
- **Adversarial / scenarios:** skipped semantic errors, long skipped syntax trees,
  128 nested blocks, a mine sweep combining every major control/robot mechanism,
  narrow maps, symmetry, state conservation after a nested failure.

Sources: PDF §1 for maps; §§2–2.1 for grammar; §2.2.1–2 for values, types,
left-to-right checks and no short-circuiting; §2.2.3 for robot API;
§2.2.4 for error codes; §3.4 for discovery/reset/counting/limits. D1 and D2 are
explicit user decisions; D3–D7 are **provisional**. See
[minescript-language.md](minescript-language.md) and AGENTS.md §6.

Do not assert JavaScript coercion, conventional operator precedence, Python block
rules, automatic gold collection, or any other familiar-language behavior unless
the MineScript specification actually requires it. Do not invent an overflow contract.

## Independent expectations and useful assertions

- Tables use mathematical results and boolean truth tables, never `eval` or the
  interpreter's own operator implementation as the expected result.
- Hand-audited traces assert exact source lines and processed counts, including
  taken `else` lines and the terminating false `while` check.
- Scenario counts are derived from source. Collector: `5 + 7*d + g`.
  R-by-C serpentine: `R*(5*C+8) - 1 + floor((R-1)/2)`.
- Mining checks remaining gold and robot position, not just a console message.
- Simulation contracts check snapshots, original-map preservation, fresh machines,
  no-op terminal steps, fog monotonicity, and gold conservation.
- Docs tests assert each stored expectation directly. The matcher is also tested
  with deliberately wrong outcomes so a permissive matcher cannot conceal a failure.
- Helpers throw on invalid fixtures and on a run that remains active after 1002 calls.
  This fuse is separate from the engine budget: a broken engine must fail, not hang.

## Performance discipline

Tests are synchronous and in-process. The final-state helper calls `snapshot()` once,
not after every interpreter step. Only trace/state tests materialize intermediate
snapshots. Generated cases are bounded (maps at most 15×15, runs at most 1002 calls).
No sleeps, animation delays, imports of React components, or build startup in tests.

Bun prints total duration and test/assertion counts. Measure with the actual selected
command; avoid hard wall-clock pass/fail thresholds that vary by hardware/load.
Do not rerun the full suite repeatedly after it passes unless new changes affect it.
Do not reduce assertions to hit an arbitrary duration target.

## Agent workflow

1. Read the PDF-backed reference and decision log for the behavior you change.
2. Derive expected results before running the current implementation.
3. Add meaningful boundary and interacting-case regressions in the owning group.
4. Run that group while iterating, then the related dependency closure for production changes.
5. Report commands, counts, failures, and duration. A passing engine suite does not
   prove the browser controls, playback timers, file import UI, or persistence work.
6. Never rewrite an expectation just to turn a failure green. Establish whether
   the PDF, explicit decision, fixture, or implementation is wrong.
7. Interpreter work remains paused. A test task may reveal a bug; report it with a
   minimal reproducer and preserve the test. Do not change engine semantics unasked.
8. Full baseline once when introducing/changing the shared harness or runner, after
   broad engine changes, or for a release. Routine work uses relevant groups only.

For application/config changes, AGENTS.md still requires lint, typecheck, and build.
Those checks are separate from the fast conformance runner.

## Diagnostics contracts

`tests/diagnostics/{syntax,runtime,engine}.test.ts` follow [diagnostics.md](diagnostics.md).
Spans are 1-based and end-exclusive; expected columns are counted from the source,
not copied from engine output. Assertions check key message/hint contents rather
than full prose. Recovery cases assert the complete ordered issue list and parser
parity. Runtime tests use the shared bounded harness. Stepping tests explicitly
check the next instruction and returned events, including partial motion (D3).
These tests do not verify editor highlighting or any other browser behavior.

## Generated adversarial contracts

`tests/adversarial/model.ts` owns an independent generated AST, source renderer,
seeded LCG and tree-walking reference interpreter. It imports only production
types; no production parser, compiler, operator evaluator or direction table is
used to derive results. 600 generated trees run against Corridor, the PDF map
and seeded small maps. Another 60 successful structured programs per map ensure
all operators, nested branches/loops, sensors and mining execute beyond early
error paths. Exact state and every event are compared; D3/D4/D7 remain provisional.
The generator avoids overflow beyond the settled numeric range.

Malformed-source fuzzing checks parser/validator parity, bounded machine runs,
diagnostic ranges/order/categories, related lines and invalid-character content
suppression. Fixed seeds and case indexes identify failures. Explicit recovery
cases retain small reproducers for malformed block heads and D1 else ownership.
All five core engine modules select this group through the related-file selector.
This group verifies engine contracts only, with the same 1002-call fuse and no
timing assertions, UI, network or playback timers.
