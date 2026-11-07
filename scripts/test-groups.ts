// Mely teszteket kell futtatni egy módosított fájl után (bun run test:related). A hozzárendelés szándékosan
// kézi: nem importálhat alkalmazáskódot a döntéshez, és az ismeretlen fájl hibát ad (unknown), nem marad ki csendben.

/** Fókuszált tesztcsoportok (`bun run test:<csoport>` néven is futtathatók). */
export const GROUPS = {
  syntax: ["tests/syntax"],
  adversarial: ["tests/adversarial"],
  diagnostics: ["tests/diagnostics"],
  maps: ["tests/maps"],
  parser: ["tests/interpreter/control.test.ts", "tests/syntax"],
  semantics: ["tests/interpreter/semantics.test.ts", "tests/interpreter/errors.test.ts"],
  control: ["tests/interpreter/control.test.ts", "tests/interpreter/limits.test.ts"],
  robot: ["tests/interpreter/robot.test.ts", "tests/interpreter/state.test.ts", "tests/scenarios"],
  limits: ["tests/interpreter/limits.test.ts"],
  state: ["tests/interpreter/state.test.ts"],
  scenarios: ["tests/scenarios"],
  docs: ["tests/docs"],
} as const;

/** Minden, ami a motort végigfuttatja. */
const ENGINE_CONSUMERS = [
  "tests/adversarial",
  "tests/interpreter",
  "tests/scenarios",
  "tests/docs",
  "tests/diagnostics",
];
const FULL_SUITE = ["tests"];
const APP_SUITE = ["convex", "components/profile", "components/map-editor", "components/workbench"];

type Rule = {
  matches: (path: string) => boolean;
  /** A futtatandó tesztek (vagy az útvonalból számolva); `[]` és `ui` esetén csak felületi ellenőrzést kér. */
  tests: readonly string[] | ((path: string) => string[]);
  /** Az alkalmazás Vitest-tesztjei (Convex függvények, profil oldal), mappák vagy fájlok. */
  appTests?: readonly string[] | ((path: string) => string[]);
  /** Felületi kód: a motortesztek egymagukban nem ellenőrzik. */
  ui?: boolean;
  /** Nem kell hozzá teszt (szöveges dokumentum). */
  skip?: boolean;
};

function isOneOf(...paths: string[]) {
  return (path: string) => paths.includes(path);
}

function isUnder(...prefixes: string[]) {
  return (path: string) => prefixes.some((prefix) => path.startsWith(prefix));
}

/** Az első illeszkedő szabály dönt, ezért a szűkebbek állnak elöl. */
const RULES: Rule[] = [
  // Motor: az elemző az interpreter bemenete, ezért a szintaxis változása minden motorfogyasztót érint.
  {
    matches: (path) =>
      isOneOf("lib/minescript.ts", "lib/examples.ts", "lib/diagnostics.ts", "lib/limits.ts", "lib/suggest.ts")(path) ||
      isUnder("lib/syntax/")(path),
    tests: ["tests/syntax", ...ENGINE_CONSUMERS],
  },
  { matches: isOneOf("lib/interpreter.ts"), tests: ENGINE_CONSUMERS },
  { matches: isOneOf("lib/robot-map.ts"), tests: ["tests/maps", ...ENGINE_CONSUMERS] },
  { matches: isOneOf("lib/map-editor.ts"), tests: GROUPS.maps, appTests: ["components/map-editor"] },
  // A térképmezők képe (felfedezett / felfedezetlen / köd).
  { matches: isOneOf("components/sprites.ts"), tests: ["tests/maps/tiles.test.ts"], ui: true },
  // A közös fájlnév-szabály és -mező: mindkét szerkesztő fájlkezelése.
  {
    matches: isOneOf("lib/file-names.ts", "components/file-name-field.tsx", "components/download-text.ts"),
    tests: ["tests/syntax/program-file.test.ts", "tests/maps/editor.test.ts"],
    appTests: ["components/map-editor", "components/workbench"],
    ui: true,
  },
  { matches: isUnder("components/map-editor/"), tests: GROUPS.maps, appTests: ["components/map-editor"], ui: true },
  // Dokumentáció: a példái futtatható szerződések.
  { matches: isUnder("lib/docs/", "components/docs/", "app/docs/"), tests: GROUPS.docs },
  // Motorra épülő felületi fájlok: a kapcsolódó motortesztek, és felületi ellenőrzés is kell.
  {
    matches: isOneOf("components/use-simulation.ts", "components/robot-motion.ts", "components/simulator.tsx"),
    tests: GROUPS.robot,
    ui: true,
  },
  {
    matches: (path) => isUnder("components/code-editor/", "components/workbench/")(path),
    tests: GROUPS.syntax,
    appTests: ["components/map-editor", "components/workbench"],
    ui: true,
  },
  // Tesztek és teszteszközök; egy módosított tesztfájl pontosan önmagát választja.
  { matches: isUnder("tests/support/"), tests: FULL_SUITE },
  { matches: (path) => /^tests\/.*\.test\.ts$/.test(path), tests: (path) => [path] },
  // Egy tesztmappa segédfájlja (pl. tests/adversarial/model.ts): a mappa összes tesztje.
  {
    matches: (path) => /^tests\/[^/]+\/[^/]+\.ts$/.test(path),
    tests: (path) => [path.slice(0, path.lastIndexOf("/"))],
  },
  {
    matches: (path) => isUnder("scripts/test-")(path) || isOneOf("package.json", "bun.lock", "tsconfig.json")(path),
    tests: FULL_SUITE,
  },
  // Convex backend és a profil oldal: a Vitest-csomag (bun run test:app).
  {
    matches: (path) => /^(convex|components\/profile)\/.*\.test\.tsx?$/.test(path),
    tests: [],
    appTests: (path) => [path],
  },
  { matches: isUnder("convex/_generated/"), tests: [], appTests: APP_SUITE },
  { matches: isUnder("convex/"), tests: [], appTests: ["convex"] },
  { matches: isUnder("components/profile/"), tests: [], appTests: ["components/profile"], ui: true },
  // A szótár szövegeit a profil, a térképszerkesztő és a munkafelület renderelési tesztjei ellenőrzik.
  {
    matches: isUnder("i18n/"),
    tests: [],
    appTests: ["components/profile", "components/map-editor", "components/workbench"],
    ui: true,
  },
  { matches: isOneOf("vitest.config.mts"), tests: [], appTests: APP_SUITE },
  // Az útvonalak és a proxy: a matcher-szinkron tesztje.
  {
    matches: isOneOf("lib/routes.ts", "proxy.ts", "lib/auth-redirect-fix.ts"),
    tests: ["tests/tooling/routes.test.ts"],
    ui: true,
  },
  // Szöveges dokumentum, majd minden más alkalmazásfájl.
  { matches: (path) => path.endsWith(".md"), tests: [], skip: true },
  {
    matches: (path) => isUnder("app/", "components/")(path) || isOneOf("next.config.ts", "lib/utils.ts")(path),
    tests: [],
    ui: true,
  },
];

export type Selection = {
  /** Motortesztek (bun test). */
  tests: string[];
  /** Alkalmazástesztek (vitest run). */
  appTests: string[];
  unknown: string[];
  ui: string[];
};

/** Egy szabály tesztlistája; a függvény alak az útvonalból számol (pl. a módosított tesztfájl önmaga). */
const resolve = (list: Rule["tests"] | undefined, path: string) =>
  typeof list === "function" ? list(path) : (list ?? []);

/** A felsorolt útvonalak, de egy már kiválasztott mappa alatti fájlok nélkül. */
function withoutCoveredPaths(paths: Set<string>): string[] {
  const all = [...paths];
  const isCoveredByParent = (path: string) => all.some((parent) => parent !== path && path.startsWith(parent + "/"));
  return all.filter((path) => !isCoveredByParent(path)).sort();
}

export function relatedTests(paths: string[]): Selection {
  const tests = new Set<string>();
  const appTests = new Set<string>();
  const unknown: string[] = [];
  const ui: string[] = [];

  for (const original of paths) {
    const path = original.replace(/^\.\//, "").replaceAll("\\", "/");
    const rule = RULES.find((candidate) => candidate.matches(path));
    if (!rule) {
      unknown.push(path);
      continue;
    }
    if (rule.skip) continue;
    if (rule.ui) ui.push(path);
    resolve(rule.tests, path).forEach((test) => tests.add(test));
    resolve(rule.appTests, path).forEach((test) => appTests.add(test));
  }

  return { tests: withoutCoveredPaths(tests), appTests: withoutCoveredPaths(appTests), unknown, ui };
}
