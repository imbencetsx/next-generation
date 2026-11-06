/** Explicit dependencies: do not import application code to decide what to test. */
export const GROUPS = {
  syntax: ['tests/syntax'],
  adversarial: ['tests/adversarial'],
  diagnostics: ['tests/diagnostics'],
  maps: ['tests/maps'],
  parser: ['tests/interpreter/control.test.ts', 'tests/syntax'],
  semantics: ['tests/interpreter/semantics.test.ts', 'tests/interpreter/errors.test.ts'],
  control: ['tests/interpreter/control.test.ts', 'tests/interpreter/limits.test.ts'],
  robot: ['tests/interpreter/robot.test.ts', 'tests/interpreter/state.test.ts', 'tests/scenarios'],
  limits: ['tests/interpreter/limits.test.ts'],
  state: ['tests/interpreter/state.test.ts'],
  scenarios: ['tests/scenarios'],
  docs: ['tests/docs'],
} as const;
const ENGINE = ['tests/adversarial', 'tests/interpreter', 'tests/scenarios', 'tests/docs', 'tests/diagnostics'];
export function relatedTests(paths: string[]): { tests: string[]; unknown: string[]; ui: string[] } {
  const tests = new Set<string>();
  const unknown: string[] = [], ui: string[] = [];
  for (const original of paths) {
    const path = original.replace(/^\.\//, '').replaceAll('\\', '/');
    let selected: readonly string[] = [];
    if (['lib/minescript.ts', 'lib/syntax.ts', 'lib/diagnostics.ts'].includes(path)) selected = ['tests/syntax', ...ENGINE];
    else if (path === 'lib/interpreter.ts') selected = ENGINE;
    else if (path === 'lib/robot-map.ts') selected = ['tests/maps', ...ENGINE];
    else if (path.startsWith('lib/docs/') || path.startsWith('components/docs/') || path.startsWith('app/docs/')) selected = GROUPS.docs;
    else if (path === 'components/use-simulation.ts' || path === 'components/simulator.tsx') { selected = GROUPS.robot; ui.push(path); }
    else if (path === 'components/code-editor.tsx' || path === 'components/workbench.tsx') { selected = GROUPS.syntax; ui.push(path); }
    else if (path.startsWith('tests/support/')) selected = ['tests'];
    else if (/^tests\/.*\.test\.ts$/.test(path)) selected = [path];
    else if (path.startsWith('scripts/test-') || path === 'package.json' || path === 'bun.lock' || path === 'tsconfig.json') selected = ['tests'];
    else if (path.endsWith('.md')) continue;
    else if (path.startsWith('app/') || path.startsWith('components/') || path === 'next.config.ts') ui.push(path);
    else unknown.push(path);
    selected.forEach(test => tests.add(test));
  }
  // Prefer a selected directory over its already-selected descendants.
  return { tests: [...tests].filter(path => ![...tests].some(parent => parent !== path && path.startsWith(parent + '/'))).sort(), unknown, ui };
}
