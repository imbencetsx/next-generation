import { Machine, parseProgram, type Snapshot } from '../../lib/interpreter';
import { parseMap, type GameMap } from '../../lib/robot-map';

export const CORRIDOR = '3 10\n##########\n>.@..@.@.#\n##########';
export const SPEC_MAP = '3 15\n....@..........\n.#############.\n.......@...>...';
export const EMPTY_MAP = '1 1\n>';

export function mapFrom(text = CORRIDOR): GameMap {
  const parsed = parseMap(text);
  if (!parsed.ok) throw new Error(`Invalid test map: ${parsed.error}`);
  return parsed.map;
}
export function machineFrom(code: string, map: GameMap = mapFrom()): Machine {
  const parsed = parseProgram(code);
  if (!parsed.ok) throw new Error(`Invalid test program: ${JSON.stringify(parsed.issues)}\n${code}`);
  return new Machine(parsed.program, map);
}
/** No snapshots in the hot loop. A separate fuse catches broken limits/blocked frames. */
export function finish(machine: Machine): Snapshot {
  for (let calls = 0; machine.status === 'running'; calls++) {
    if (calls >= 1002) throw new Error('Harness fuse: engine did not terminate after 1002 step calls');
    machine.step();
  }
  return machine.snapshot();
}
export function run(code: string, map = CORRIDOR): Snapshot {
  return finish(machineFrom(code, mapFrom(map)));
}
export function trace(code: string, map = CORRIDOR): Snapshot[] {
  const machine = machineFrom(code, mapFrom(map));
  const states: Snapshot[] = [];
  for (let calls = 0; machine.status === 'running'; calls++) {
    if (calls >= 1002) throw new Error('Trace fuse: execution did not terminate');
    machine.step();
    states.push(machine.snapshot());
  }
  return states;
}
export function coordinates(bits: boolean[], cols: number): string[] {
  return bits.flatMap((present, i) => present ? [`${i % cols},${Math.floor(i / cols)}`] : []);
}
