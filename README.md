# Next Generation

A web application built with Next.js, React, and TypeScript.

## Getting started

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

Open [localhost:3000/test](http://localhost:3000/test) for the editor and simulator. Documentation is at `/docs`.

## Commands

- `bun run dev` — start the development server
- `bun run build` — create a production build
- `bun run start` — serve the production build
- `bun run lint` — run ESLint

## MineScript reference and tests

- [Language contract](docs/minescript-language.md): grammar, exact semantics, robot API, errors, scoring, and provisional decisions.
- [Testing guide](docs/testing.md): categorized tests, difficulty levels, and targeted commands.

```sh
bun run test:related -- lib/interpreter.ts  # affected engine/scenario/docs tests
bun run test:robot                        # motion, sensors, state, challenge programs
bun run test:docs                         # all documented programs
bun test tests                           # full baseline only when appropriate
```

The tests use Bun's native runner and execute without a Next.js server or browser.
