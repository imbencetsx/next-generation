// A módosított fájlokhoz tartozó tesztek futtatása (a hozzárendelés: scripts/test-groups.ts).
// A motortesztek a Bun saját futtatójával, az alkalmazástesztek (Convex, profil) Vitesttel futnak.

import { relatedTests } from "./test-groups";

const paths = process.argv.slice(2).filter((arg) => arg !== "--");
if (!paths.length) {
  console.error(
    "Usage: bun run test:related -- <changed-file> [changed-file…]\nExample: bun run test:related -- lib/interpreter.ts\nPass explicit task files; unrelated working-tree changes must not expand your test run.",
  );
  process.exit(2);
}

const selected = relatedTests(paths);
if (selected.unknown.length) {
  console.error(
    `No dependency mapping for: ${selected.unknown.join(", ")}. Choose a test group explicitly; do not silently skip unknown changes.`,
  );
  process.exit(2);
}
if (selected.ui.length) {
  console.log(
    `UI changes: ${selected.ui.join(", ")}. Engine tests do not test React rendering, timers, controls, or browser accessibility; verify the changed UI separately.`,
  );
}
if (!selected.tests.length && !selected.appTests.length) {
  console.log(
    "No tests selected for these files. Documentation-only prose changes need review; application changes need the relevant UI/build checks.",
  );
  process.exit(0);
}

/** Egy tesztfuttató indítása; a kimenete közvetlenül a terminálra megy. Igaz, ha sikeres. */
function run(label: string, command: string[]): boolean {
  console.log(`${label}: ${command.slice(2).join(", ")}`);
  return Bun.spawnSync(command, { stdout: "inherit", stderr: "inherit" }).exitCode === 0;
}

let ok = true;
if (selected.tests.length) ok = run("Engine tests", [process.execPath, "test", ...selected.tests]) && ok;
if (selected.appTests.length) ok = run("App tests", ["bunx", "vitest", "run", ...selected.appTests]) && ok;
process.exit(ok ? 0 : 1);
