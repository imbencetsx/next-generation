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
| Code editor (CodeMirror 6, highlighting, lint, autocomplete, import/export, examples) | done | `components/code-editor/`, `components/workbench/` |
| Syntax analysis: one-pass lexer, parser with error recovery, compiler to flat instructions | done | `lib/syntax/` (`validateMineScript` in `lib/minescript.ts` is a thin entry point) |
| Interpreter: program-counter machine, one source line per step, step events | done | `lib/interpreter.ts` |
| Diagnostics: coded syntax/runtime errors with exact column spans, hints, related lines | done | `lib/diagnostics.ts`, contract in `docs/diagnostics.md` |
| Map model + map file parser + built-in maps | done | `lib/robot-map.ts` |
| Simulator panel (playback, map, console, variables, fog) | basic | `components/simulator.tsx`, `components/use-simulation.ts` |
| Documentation site at `/docs/[slug]` (Hungarian, dark, runnable examples) | done | `app/docs/`, `components/docs/`, `lib/docs/` |
| Map editor (text + visual, new/import/export, presets, back to the simulator) | done | `app/map-editor/`, `components/map-editor/`, `lib/map-editor.ts`, `components/code-editor/map-mode.ts` |
| Backend: Convex cloud (dev deployment from `.env.local`; production via `bun run build:prod`) | set up | `convex/` |
| Auth: Convex Auth, username + password, open registration; httpOnly cookie sessions, `/workbench` and `/profile` gated server-side by `proxy.ts` | done | `convex/auth.ts`, `convex/users.ts`, `proxy.ts`, `app/login/`, `components/auth/` |
| Home page (`/`): write a program, make a map, browse published maps | done | `app/(home)/`, `components/home/` |
| Map publishing (shared, immutable, owner can delete; server re-validates with `parseMap`) | done | `convex/maps.ts`, `convex/mapRules.ts`, `components/map-editor/publish-map.tsx` |
| Best result per player per published map (server re-runs the program; only a better score replaces it) | done | `convex/results.ts`, `lib/scoring.ts`, `components/workbench/use-result-recorder.ts` |
| Leaderboard: each published map has its own page `/maps/<id>` (big preview, details, write-a-program button, top 50 by PDF 3.5 order; equal results share a place, the earlier one first), opened from the map's "Ranglista" button | done | `app/maps/[mapId]/`, `components/map-page/`, `convex/results.ts` (`leaderboard`), `convex/maps.ts` (`get`) |
| Saving programs | planned | — |
| Fast conformance tests (Bun native runner) | done | `tests/`, `scripts/test-related.ts`, `docs/testing.md` |
| Browser / React playback integration tests | planned | — |

**Engine semantics are frozen to the PDF and §6.** Do not change what programs mean (validity, outputs, counts, error codes/lines) without the user's approval. Improving diagnostics, performance or structure is fine when behaviour stays identical and the conformance suite stays green.

## 3. Stack, commands, conventions

- Next.js **16.4.5** (App Router, `cacheComponents: true`), React 19.3, TypeScript (strict), Tailwind CSS 4, Bun 1.3. Editor: CodeMirror 6. Icons: lucide-react. Backend/DB: **Convex** (hosted on Convex's free cloud tier; `bun run convex:dev` syncs `convex/` and writes `.env.local`). Read `convex/_generated/ai/guidelines.md` before writing Convex code.
- Use **bun**: `bun dev`, `bun run build`, `bun run lint`, `bun run format`, `bunx tsc --noEmit`. Run format + lint + typecheck + build before handing work back.
- **Formatting** is Prettier (`.prettierrc.json`, print width 120; `bun run format` writes, `bun run format:check` verifies). ESLint adds `curly: multi-line`, so an `if` whose body wraps gets braces. Keep components small: one component per concern, extract a sub-component or helper instead of packing JSX or logic onto one line. Name magic numbers (`MAX_LINES`, `CELL_KIND`, `TILES`, `SPEEDS`, …).
- This is *not* the Next.js in your training data — read `node_modules/next/dist/docs/` first (see block at the end). With `cacheComponents`, `dynamicParams` does not exist; use `generateStaticParams` + `notFound()`. `params`/`searchParams` are Promises. `useSearchParams` needs a `<Suspense>` boundary.
- ESLint enforces React-compiler rules: no ref access during render (`react-hooks/refs`), no `setState` inside effects. Put ref reads in event handlers/effects.
- Language of text: the **app UI is English and Hungarian** (language setting on `/profile`, saved to the account and used across devices; `/login` keeps a globe + language-code toggle for signed-out visitors; account preference takes priority over the `lang` cookie, then `Accept-Language`). Every UI string lives in `i18n/en.ts` (the source; its shape is the `Messages` type) and `i18n/hu.ts` (must have the same keys, the type enforces it); `i18n/messages.ts` combines them; read them with `useI18n().t`, never hardcode UI text in components. Engine diagnostics and map-parse errors from `lib/` stay English with their codes. The **docs site is Hungarian** (`lang="hu"` on its root); code identifiers and this file are English. Application comments are Hungarian: keep them brief and natural, explain non-obvious decisions, and use short file or section headers where they help navigation. Avoid repetitive comments and narrating obvious code. Tests and scripts follow the same rule (Hungarian comments); test names (`test('…')`) stay English like other identifiers. Interpreter error messages are English and carry the official error code.
- Commit messages for **this repository only** must be in Hungarian: write subjects and bodies in concise, natural Hungarian with correct accents. Preserve code identifiers, file paths, command names, and Conventional Commit prefixes such as `feat:`, `fix:`, and `docs:` unchanged. This convention applies to agent-written and T3 Code-generated commit messages; it does not change other projects or the languages used elsewhere in this repository.
- Keep the engine (`lib/`) free of React, DOM, DB and timers so it can run in the browser, in tests and on the server (leaderboard re-run in a Convex function) identically.
- **Icons:** pixel icons only (`pixelarticons`, MIT), imported from `components/icons.tsx` under app-specific names (`Play`, `StepForward`, `Reset`, `Alert`, `Check`, `Cross`, …). The wrapper snaps sizes to the 24-px grid (12/16/20/24, and 48 for large decorative icons) and renders `crispEdges`; buttons size icons to 20 px (16 px in `sm`). `lucide-react` is not installed: shadcn's generator still writes lucide imports (`components.json` iconLibrary), so after `shadcn add` switch them to `@/components/icons`. Add a missing icon to `components/icons.tsx` (browse `node_modules/pixelarticons/react/`).
- **UI components:** shadcn with base-ui (`components.json`, style `base-nova`). Add more with `bunx --bun shadcn@latest add <name>`; the generator may write `from "cn"`, which must be `@/lib/utils`. `Button` sets `data-variant`, which the pixel frames key on.
- **Pixel frames (from larp):** inside `.app-ui`, elements with `data-slot` card/button/badge/input/native-select (or `.pixel-frame`) get a nine-slice SVG border and a stepped clip-path, and buttons get a pressable lip (`app/globals.css`, "pixel keretek"). Do not add `rounded-*` or `ring-*` to them. Focus is drawn inside the frame (an outside outline would be clipped).
- **App look (/workbench, /login, /profile)** follows the user's larp project: dark only, Pixelify Sans for UI chrome (buttons, labels, titles; `.app-ui`), Tiny5 for display text (`.display`), Google Sans (`font-read`) for everything people type or read at length (inputs and selects automatically; messages, hints, descriptions via `font-read`), never pixel type for those; the logo is pixel art in `public/logo.svg` (52×28, shown by `components/logo.tsx` at 1.5× (exact 3 device pixels per art pixel on Retina), left of the top bar; the art is trimmed to its pixel bounds so it sits centred in the SVG), Geist Mono for code, small uppercase `.eyebrow` labels, shadcn `Card` panels, `Button` variants (default = gold primary, outline, ghost), `Input`, `NativeSelect`. Two colours only: white `#EAE7DD` for text, structure and selected states (pressed toggles use the light frame), and gold `#F0A700` (from `gold_chips.png`) reserved for the one primary action per area, focus, the running line and code keywords. Brick `#8C342B` (`wall.png`) appears only for errors (`--brick-text` `#E8806F` for error text). Dark charcoal `#141414` background, `#1B1B1B` cards, a light `--rule` line under the top bar. Panel titles are short sentence-case `.panel-title`, not all-caps labels. Use the Tailwind tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-brick-text`, `bg-brick`, …), not new hex values; the pixel frame SVGs in `public/artwork/borders/` use the same colours. Component classes live in `@layer components` so utilities can override them. Pixelify's ligatures are disabled (its "fi" looks like "A"), and it draws `_` like `..`, so spell it out in UI text. The docs site uses the same system (`.app-ui docs`): pixel top bar with the logo, numbered chapter nav (selected = light frame), Tiny5 page titles, Pixelify headings, Google Sans body text capped at 72ch, `Card` examples with gold run button, sprite-based `MiniMap`, `DocBadge` (server-safe badge) and `Note` with icon + title. Sprite constants shared by server and client live in `components/sprites.ts` (a server component cannot read values from a `"use client"` module).
- Accessibility is graded: keyboard-operable controls, visible focus, never color alone (icons/text too), `prefers-reduced-motion`, screen-reader status text.

### Repo map

```
app/(home)/                  / home page (signed-in): start cards + published maps; route group keeps the root layout static (next.config.ts redirects the old /test URL to /workbench)
components/home/             index.tsx (page), robot-greeting.tsx (the strip's robot greets the player by name in a big Pixelify speech bubble; line picked on the server in app/(home)/page.tsx), published-maps.tsx (All/Mine, paginated), mine-strip.tsx (tunnel of game sprites: explored behind the robot, unexplored ahead; the page's only motion), map-entry.tsx (one published map in a pixel-frame border, no background: preview, details, write a program, Leaderboard link, delete own)
components/map-page/         /maps/<id>: index.tsx (map details + leaderboard section), leaderboard.tsx (ranking table), medal.tsx (gold/silver/bronze for places 1–3); app/maps/[mapId]/page.tsx reads the id inside Suspense (unknown ids at build time)
convex/maps.ts               publish / list (paginated, newest first, `mine`) / remove; table `maps` (immutable, by_ownerId)
convex/mapRules.ts           MAP_* error codes and publishedMapName (1–60 chars), shared with the client
convex/results.ts            record (server re-runs the code on the stored map, keeps the player's best; an improvement replaces the row so _creationTime = when it was reached) / myBest / leaderboard (top LEADERBOARD_SIZE); table `results` (by_mapId_and_userId, by_mapId_and_rank)
convex/resultRules.ts        RESULT_* error codes and the recorded-code size limit
lib/scoring.ts               Score, isBetterScore (PDF 3.5 order), scoreRank (single sortable key), scoreProgram (run to the end, as the UI would)
components/workbench/use-result-recorder.ts, published-map-result.tsx  record finished runs on a published map (?mapId=) and show the player's best
app/icon.svg, app/favicon.ico, app/apple-icon.png  favicon: the robot's front idle frame (robot_sheet row 1, col 1), transparent, centred on its visible 22×23 pixels (the sprite has near-invisible alpha ≤ 16 noise pixels; drop them before measuring); 32 px 1:1, 64 px 2×, Apple 6× (regenerate all three if the sprite changes)
app/workbench/page.tsx       /workbench: editor + simulator workbench
app/map-editor/page.tsx      /map-editor: map editor (signed-in; ?map=, ?mapName=, ?code=, ?filename= carry the state between home, simulator and editor; `withMap()` in lib/routes.ts builds the map links)
lib/map-editor.ts            pure map-editing operations: createMap, formatMap (= parseMap inverse), resizeMap, paintCell, MapDocument (source + name), mapName/mapFilename
components/map-editor/       index.tsx (layout, problems), file-toolbar.tsx, map-controls.tsx (brushes, size, direction), map-grid.tsx (keyboard grid), use-map-document.ts
components/code-editor/map-mode.ts  CodeMirror support for map files (highlighting + parseMap lint); CodeEditor `mode="map"`
components/download-text.ts  shared text-file download for program and map export
components/file-name-field.tsx  shared file-name input (name + fixed extension) used by both editor toolbars
lib/file-names.ts            editable file names: fileBaseName / fileNameWith (programName/.mine, mapName/.map build on it)
lib/routes.ts                ROUTES, mapPath(id) and docPath(slug): every app path in one place (proxy.ts `config.matcher` repeats them literally; tests/tooling/routes.test.ts keeps them in sync)
app/docs/                    docs site: layout (dark), /docs → /docs/attekintes, [slug] pages
components/docs/pages/       one Hungarian content component per docs page
components/docs/example.tsx  runnable example card (runs the real engine, checks the expected result)
lib/docs/examples.ts         DOC_EXAMPLES catalogue: code + map + expected result for every docs example
lib/docs/nav.ts              docs page list (slug, title, description) — drives nav and static params
components/code-editor/      CodeMirror: index.tsx (React wrapper, read-only lock), minescript-mode.ts (highlighting, completion, Tab, indent, lint), theme.ts, active-line.ts (running/error line)
components/workbench/        page shell: index.tsx (layout, status bar), file-toolbar.tsx (editable program name with a fixed .mine suffix, New/Import/Export/Wrap, example select), problems-panel.tsx (syntax problems + reference), use-program-file.ts (code, name, file operations; programName/programFilename in lib/minescript.ts)
components/top-bar.tsx       shared top bar (logo left, actions right) and AccountActions (user menu)
components/playback-bar.tsx  Run/Pause, Step, Reset, Speed, run status and the "fix N syntax errors" notice (in the editor header)
components/simulator.tsx     map panel: map select/import/fog, gold/lines stats, runtime error box (renders PixelMap)
components/pixel-map.tsx     pixel-art map: 32×32 sprites scaled to fill the panel (cell rounded down to whole device pixels, never overflows), gold shine, sliding robot
public/sprites/              tiles: empty-dirt (dug chamber), full_dirt (undug/fog), gold + 4 shine frames and gold_chips* cut-outs (regenerate with scripts/cut-gold-chips.py), robot_sheet (4×4: idle + 3 walk frames; rows down/left/right/up), wall (explored brick), wall-unexplored (dark brick); `mapTile()` in components/sprites.ts picks a cell's tile from wall/explored/fog
components/use-simulation.ts map state, Machine instance, playback timer, named SPEEDS
components/robot-motion.ts   Motion: how far the robot slides and when each cell is dug (animation timing only)
convex/                      Convex backend; _generated/ is CLI output (do not edit)
convex/auth.ts               Convex Auth with a custom username/password credentials provider (id "username", Scrypt)
convex/auth.config.ts        JWT issuer config — without it every user looks signed out
convex/credentials.ts        username/password rules shared by the server and the login form
convex/users.ts              currentUserId(ctx) (checks the session too) and the viewer query
scripts/setup-auth.ts        sets JWT_PRIVATE_KEY / JWKS / SITE_URL on a Convex deployment: bun run auth:setup -- [--prod] --site-url <origin>
.env.example                 every env var the app needs, with where it comes from
components/pixel-circle.tsx  stepped pixel circle with lighting (profile picture, leaderboard medals); components/gold-shine.tsx sparkling gold nugget (strip, previews)
components/ui/               shadcn (base-ui, base-nova) components: button, card, input, label, native-select, badge, alert-dialog (pixel frame, `app-ui` on the portal popup)
public/artwork/borders/      12×12 nine-slice pixel frames (palette colours) used by the shadcn components
proxy.ts                     Next 16 proxy: Convex Auth cookies + /api/auth route; redirects signed-out /workbench and /profile → /login?next=…
                             (also works around a @convex-dev/auth 0.0.96 bug that turned our redirects into 200s)
app/workbench, app/login, app/profile layout.tsx  wrap only these routes in AppProviders (components/app-providers.tsx: cookie session, Convex client, i18n, Suspense); /docs stays static
components/auth/             login-form, login-scene (speech bubble), require-auth (client fallback), user-menu
components/profile/          /profile page: profile-page.tsx (layout) + picture-form, username-form, password-form, feedback; prepare-picture.ts (pixel avatar in the browser)
convex/errors.ts             coded errors for the client: ConvexError({ code: "PROFILE_taken" }); errorKeyFrom reads error.data.code (or the code inside the message for /api/auth, which forwards only text); the UI translates the key
convex/credentials.ts        username/password rules, AUTH_ERRORS and authError / authErrorKey
convex/png.ts                PNG header size check (no decoding)
convex/profileRules.ts       avatar limits and PROFILE_* errors (`throw profileError("taken")`), shared with the client
i18n/                        locale.ts (EN/HU, cookie), en.ts + hu.ts (all UI strings), messages.ts (combines them), i18n-provider.tsx (useI18n); components/language-switch.tsx
components/convex-client-provider.tsx  ConvexAuthNextjsProvider; tokens come from httpOnly cookies via /api/auth
lib/syntax/                  the only parser, one pass: vocabulary.ts (keywords, operators, token patterns shared with the editor, names, alias hints), scanner.ts (line → tokens), character-hints.ts (invalid-character messages), line-context.ts (per-line state, first error), line-parser.ts (tokens → statement),
                             values.ts (simpleval), expressions.ts (right side of set),
                             analyze.ts (analyzeSource: line loop, recovery), else-branch.ts (else pairing and diagnostics), block-stack.ts (indentation → open blocks), compiler.ts (flat instructions), program.ts / tree.ts (types)
lib/diagnostics.ts           Diagnostic, SYNTAX_CODES / ERROR_CODES (types derive from them), message helpers (quote, plural, cellName)
lib/limits.ts                the PDF's numeric limits: MAX_MAP_SIZE, MAX_NUMBER_LITERAL, MAX_LINES
lib/suggest.ts               editDistance / closest for "did you mean" hints
lib/examples.ts              EXAMPLES: the editor's sample programs (filename = i18n key)
lib/minescript.ts            PROGRAM_EXTENSION, re-exports EXAMPLES, KEYWORDS/isIdentifier, validateMineScript (= syntax issues)
lib/interpreter.ts           parseProgram, Machine (pc over flat instructions, one line per step), StepEvent, idleSnapshot
lib/robot-map.ts             GameMap, DIRECTIONS, parseMap (header → row count → grid), cellIndex/cellAt, MAP_PRESETS
tests/                       categorized PDF-backed conformance and simulation contracts
scripts/test-related.ts      targeted dependency-aware test runner (explicit task paths); engine tests via bun test, Convex/profile tests via vitest
scripts/test-groups.ts       the explicit file → tests mapping (unknown files fail closed)
lib/auth-redirect-fix.ts     proxy workaround for a @convex-dev/auth 0.0.96 redirect bug (says when it can go)
docs/minescript-language.md  standalone language reference for agent ingestion
docs/diagnostics.md          diagnostics contract: every error code, its span and required content
docs/testing.md              test groups, commands, source mapping, performance discipline
```

### Beta (Vercel) and production (VPS)

- **Beta on Vercel uses the Convex *dev* deployment on purpose** (it is a test site). Vercel env: only `NEXT_PUBLIC_CONVEX_URL` = the dev `.convex.cloud` URL (public, not a secret); build command stays `bun run build`, never `build:prod`. Vercel only builds the frontend, so push `convex/` changes to dev with `bun run convex:dev` before testing the beta. Beta and local dev share one database.
- **Production runs on a VPS** with its own Convex production deployment:

1. Create a production deploy key in the Convex dashboard and set `CONVEX_DEPLOY_KEY` on the build machine (a real secret).
2. Once per deployment: `bun run auth:setup -- --prod --site-url https://<your-domain>`.
3. Each release: `bun run build:prod` (deploys `convex/` to production, then runs `next build` with the production `NEXT_PUBLIC_CONVEX_URL`), then `next start` on the Node server. Only the Next.js server is self-hosted; Convex is hosted by Convex.

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
| D9 | Which runs are recorded for the leaderboard? (PDF 3.5: "minden programfuttatás végén") | Only runs on a **published** map. Every run that **ends** counts: program end, runtime error or the 1000-line limit, with the gold mined and lines processed until then. A run stopped with **Reset** has not ended and is **not recorded**. Only each player's **best** per map is stored (more gold, then fewer steps; an exact tie keeps the earlier one). The server re-runs the code itself (`lib/scoring.ts`). | best-only: user request 2026-11-07; which runs count: provisional |
| D8 | Are maps per user or shared? (PDF 3.2 leaves it to the team) | **Published maps are shared** with every signed-in player (home page). A published map is **immutable**; edits are published again, so leaderboard results always refer to the exact map they were played on. Owners can delete their own maps. | sharing: user request 2026-11-07; immutability + owner delete: provisional |

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

- Hungarian, always dark, statically prerendered, styled like the app (see §3 App look). Pages: `attekintes`, `nyelv`, `robot`, `terkepek`, `interpreter`, `hibak`, `dontesek`. Add a page by adding it to `lib/docs/nav.ts` and to the `CONTENT` map in `app/docs/[slug]/page.tsx`.
- **Every MineScript example in the docs comes from `DOC_EXAMPLES`** and is shown with `<Example id="…" />`. Each entry states its expected result (`ok` with output/steps/gold, `syntax` with line, or `runtime` with error code and line). The reader can run it; a green check means the engine agrees with the docs.
- When you add or change an example, or change engine behaviour, run every `DOC_EXAMPLES` entry through `runExample` + `matchesExpectation` and make sure all pass. A failing example means either the docs or the engine is wrong — find out which; don't just edit the expectation.
- "Megnyitás a szerkesztőben" opens `/workbench?code=…&map=…`; the workbench reads these via `useSearchParams` (that is why `app/workbench/page.tsx` wraps it in `<Suspense>`).
- Keep `/docs/dontesek` and §6 of this file in sync.

## 9. Testing policy — targeted, fast, specification-driven

- Start with `docs/minescript-language.md` for the full language contract and `docs/testing.md` for the test catalogue. `bun run test` runs both suites: the engine suite (`bun run test:engine`) uses **Bun's native runner**, not Vitest, and the app suite (`bun run test:app`, Vitest) covers Convex functions and profile rendering; no Next server, DOM, database, timers, or browser is required for engine tests.
- **Run relevant tests, not every test by habit.** Use `bun run test:related -- <task-file> [task-file…]` to include transitive consumers. Pass files from the current task, not unrelated dirty files. Unknown dependencies must be mapped or tested explicitly; never silently skip them.
- Focused groups: `test:syntax`, `test:maps`, `test:parser`, `test:semantics`, `test:control`, `test:robot`, `test:limits`, `test:state`, `test:scenarios`, `test:docs`, `test:tooling`. Prefix with `bun run`. Narrow a specific file with `bun test ./tests/interpreter/errors.test.ts -t 'pattern'` when iterating.
- Validator changes affect syntax **and** interpreter/scenario/docs tests. Map model changes affect map tests **and** interpreter/scenario/docs consumers. Interpreter changes affect interpreter/scenario/docs tests. Docs fixtures affect `test:docs`. The selector encodes this dependency closure.
- **Full suite:** `bun test tests` once for a new/changed shared harness, test-runner/dependency configuration, broad engine changes, or release verification. Once it passes, rerun only affected groups unless new failures or changes justify broader checks.
- Add easy, boundary, and hard interacting cases for changed behavior. Assert exact output, error code and source line, processed-line count, robot position/direction, remaining/mined gold, and exploration where relevant. Include both successful and failing paths; do not pad counts with duplicate trivial tests.
- Derive expectations independently from the PDF / explicit project decisions, not from current engine output. No `eval`, JavaScript truthiness, short-circuit assumptions, familiar-language precedence, or automatic mining. Label D3–D7 provisional behavior. Do not make integer overflow beyond the specified range a new contract.
- Keep tests deterministic and bounded. Use the shared harness's 1002-call fuse so a broken 1000-line limit cannot hang the suite. No real sleeps, playback animation, network, or timing assertions. Final-state tests take one final snapshot; only trace tests copy intermediate states.
- When docs examples change, `bun run test:docs` must pass. It directly asserts every `DOC_EXAMPLES` expectation and checks the matcher with wrong outcomes. Never merely change an expectation to match a bug.
- Report the selected command, passing/failing count, and duration. Engine tests do **not** verify React rendering, playback timers, buttons, file inputs, responsive layout, accessibility, auth, persistence, or leaderboard writes. UI changes need the relevant UI verification too.
- Test-only tasks must not modify `lib/`. Preserve and report a failing conformance test with its minimal reproducer; ask for implementation work separately.
- Diagnostics tests check codes, `line`/`column`/`endColumn`, `related` lines and the key contents listed in `docs/diagnostics.md` — never full message prose.
- Lint, typecheck, and build requirements in §3 remain applicable to application/config changes. They are not part of the fast engine test loop.

## 10. Pitfalls — don't do these

- Don't compile MineScript to JavaScript or use `eval`/`new Function`.
- Don't short-circuit `and`/`or`, and don't change the operand check order (§5.4) — tests and the leaderboard depend on exact error codes.
- Don't reject type errors at parse time; types are run-time only.
- Don't count animation frames or cells moved as steps; count lines in the engine, never in the UI.
- Don't put game rules in React components; the UI only renders engine snapshots.
- Don't write a second parser or validator. All source analysis goes through `analyzeSource` in `lib/syntax/`; the validator and the runnable program come from the same pass.
- Don't report a problem as a bare string: use a coded `Diagnostic` with an exact span (and a hint when a fix is known), as defined in `docs/diagnostics.md`.
- Don't trust client-sent gold/steps for the leaderboard (planned): the server re-runs the program with the same engine on the stored map version.
- Don't sign up through `createAccount` without checking the name first (see the `isUsernameTaken` check in `convex/auth.ts`): for an existing account it signs in on a correct password, which makes sign-up a lockout-free password oracle.
- Don't accept a user id as a Convex function argument. Get the caller with `currentUserId(ctx)` from `convex/users.ts` and throw/return null when it is null.
- Auth secrets (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`) live on each Convex deployment, never in the repo or `.env*`. Set them with `bun run auth:setup` (it refuses to replace existing keys without `--rotate`); never use the interactive `@convex-dev/auth` wizard. Don't hardcode accounts or passwords (no seed users in code).
- Don't overwrite a valid map or program with a failed import.
- Don't remove the Next.js agent block below; `next dev` re-adds it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
