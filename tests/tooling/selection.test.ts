import { expect, test } from "bun:test";
import { GROUPS, relatedTests } from "../../scripts/test-groups";

test("syntax changes include every transitive engine consumer", () =>
  expect(relatedTests(["lib/minescript.ts"]).tests).toEqual([
    "tests/adversarial",
    "tests/diagnostics",
    "tests/docs",
    "tests/interpreter",
    "tests/scenarios",
    "tests/syntax",
  ]));
test("map changes include parsing and execution consumers", () =>
  expect(relatedTests(["lib/robot-map.ts"]).tests).toEqual([
    "tests/adversarial",
    "tests/diagnostics",
    "tests/docs",
    "tests/interpreter",
    "tests/maps",
    "tests/scenarios",
  ]));
test("interpreter changes do not rerun map parser or standalone syntax tests", () =>
  expect(relatedTests(["lib/interpreter.ts"]).tests).toEqual([
    "tests/adversarial",
    "tests/diagnostics",
    "tests/docs",
    "tests/interpreter",
    "tests/scenarios",
  ]));
test("a docs fixture change runs only documentation contracts", () =>
  expect(relatedTests(["lib/docs/examples.ts"]).tests).toEqual(["tests/docs"]));
test("a test edit selects just that test", () =>
  expect(relatedTests(["tests/interpreter/robot.test.ts"]).tests).toEqual(["tests/interpreter/robot.test.ts"]));
test("shared harness changes select the full suite", () =>
  expect(relatedTests(["tests/support/harness.ts"]).tests).toEqual(["tests"]));
test("parent directories deduplicate descendants", () =>
  expect(relatedTests(["lib/interpreter.ts", "tests/interpreter/robot.test.ts"]).tests).toEqual([
    "tests/adversarial",
    "tests/diagnostics",
    "tests/docs",
    "tests/interpreter",
    "tests/scenarios",
  ]));
test("unknown dependencies fail closed", () =>
  expect(relatedTests(["lib/new-engine-module.ts"]).unknown).toEqual(["lib/new-engine-module.ts"]));
test("UI changes explicitly require additional UI verification", () =>
  expect(relatedTests(["components/use-simulation.ts"]).ui).toEqual(["components/use-simulation.ts"]));
test("prose-only changes do not trigger the entire engine", () =>
  expect(relatedTests(["AGENTS.md", "docs/minescript-language.md"]).tests).toEqual([]));
test("normalizes relative path prefix and Windows separators", () =>
  expect(relatedTests(["./lib\\interpreter.ts"]).tests).toEqual(relatedTests(["lib/interpreter.ts"]).tests));

test("syntax module includes syntax, engine and diagnostics consumers", () =>
  expect(relatedTests(["lib/syntax/line-parser.ts"]).tests).toEqual(relatedTests(["lib/minescript.ts"]).tests));
test("diagnostic module includes syntax, engine and diagnostics consumers", () =>
  expect(relatedTests(["lib/diagnostics.ts"]).tests).toEqual(relatedTests(["lib/minescript.ts"]).tests));
test("diagnostics group selects only diagnostic contracts", () =>
  expect(GROUPS.diagnostics).toEqual(["tests/diagnostics"]));
test("diagnostics edits select just that file", () =>
  expect(relatedTests(["tests/diagnostics/runtime.test.ts"]).tests).toEqual(["tests/diagnostics/runtime.test.ts"]));

test("adversarial group selects only generated contracts", () =>
  expect(GROUPS.adversarial).toEqual(["tests/adversarial"]));

test("convex changes select the Vitest app suite", () => {
  const selection = relatedTests(["convex/users.ts"]);
  expect(selection.tests).toEqual([]);
  expect(selection.appTests).toEqual(["convex"]);
});
test("an edited app test selects just that file", () =>
  expect(relatedTests(["components/profile/profile-page.test.tsx"]).appTests).toEqual([
    "components/profile/profile-page.test.tsx",
  ]));
test("dictionary edits run the rendering test and ask for UI checks", () => {
  const selection = relatedTests(["i18n/hu.ts"]);
  expect(selection.appTests).toEqual([
    "components/auth",
    "components/home",
    "components/map-editor",
    "components/map-page",
    "components/maps",
    "components/profile",
    "components/workbench",
  ]);
  expect(selection.ui).toEqual(["i18n/hu.ts"]);
});

test("account robot changes include persistence and every rendering consumer", () => {
  const selection = relatedTests(["lib/robots.ts", "components/robot-sprite.tsx"]);
  expect(selection.unknown).toEqual([]);
  expect(selection.appTests).toEqual([
    "components/home",
    "components/map-editor",
    "components/map-page",
    "components/maps",
    "components/profile",
    "components/workbench",
    "convex",
  ]);
});
