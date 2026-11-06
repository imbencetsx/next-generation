import { expect, test } from 'bun:test';
import { relatedTests } from '../../scripts/test-groups';

test('syntax changes include every transitive engine consumer', () => expect(relatedTests(['lib/minescript.ts']).tests).toEqual(['tests/docs', 'tests/interpreter', 'tests/scenarios', 'tests/syntax']));
test('map changes include parsing and execution consumers', () => expect(relatedTests(['lib/robot-map.ts']).tests).toEqual(['tests/docs', 'tests/interpreter', 'tests/maps', 'tests/scenarios']));
test('interpreter changes do not rerun map parser or standalone syntax tests', () => expect(relatedTests(['lib/interpreter.ts']).tests).toEqual(['tests/docs', 'tests/interpreter', 'tests/scenarios']));
test('a docs fixture change runs only documentation contracts', () => expect(relatedTests(['lib/docs/examples.ts']).tests).toEqual(['tests/docs']));
test('a test edit selects just that test', () => expect(relatedTests(['tests/interpreter/robot.test.ts']).tests).toEqual(['tests/interpreter/robot.test.ts']));
test('shared harness changes select the full suite', () => expect(relatedTests(['tests/support/harness.ts']).tests).toEqual(['tests']));
test('parent directories deduplicate descendants', () => expect(relatedTests(['lib/interpreter.ts', 'tests/interpreter/robot.test.ts']).tests).toEqual(['tests/docs', 'tests/interpreter', 'tests/scenarios']));
test('unknown dependencies fail closed', () => expect(relatedTests(['lib/new-engine-module.ts']).unknown).toEqual(['lib/new-engine-module.ts']));
test('UI changes explicitly require additional UI verification', () => expect(relatedTests(['components/use-simulation.ts']).ui).toEqual(['components/use-simulation.ts']));
test('prose-only changes do not trigger the entire engine', () => expect(relatedTests(['AGENTS.md', 'docs/minescript-language.md']).tests).toEqual([]));
test('normalizes relative path prefix and Windows separators', () => expect(relatedTests(['./lib\\interpreter.ts']).tests).toEqual(relatedTests(['lib/interpreter.ts']).tests));
