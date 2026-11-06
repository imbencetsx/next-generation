import { relatedTests } from './test-groups';

const paths = process.argv.slice(2).filter(arg => arg !== '--');
if (!paths.length) {
  console.error('Usage: bun run test:related -- <changed-file> [changed-file…]\nExample: bun run test:related -- lib/interpreter.ts\nPass explicit task files; unrelated working-tree changes must not expand your test run.');
  process.exit(2);
}
const selected = relatedTests(paths);
if (selected.unknown.length) {
  console.error(`No dependency mapping for: ${selected.unknown.join(', ')}. Choose a test group explicitly; do not silently skip unknown changes.`);
  process.exit(2);
}
if (selected.ui.length) console.log(`UI changes: ${selected.ui.join(', ')}. Engine tests do not test React rendering, timers, controls, or browser accessibility; verify the changed UI separately.`);
if (!selected.tests.length) {
  console.log('No engine tests selected for these files. Documentation-only prose changes need review; application changes need the relevant UI/build checks.');
  process.exit(0);
}
console.log(`Selected: ${selected.tests.join(', ')}`);
const result = Bun.spawnSync([process.execPath, 'test', ...selected.tests], { stdout: 'inherit', stderr: 'inherit' });
process.exit(result.exitCode);
