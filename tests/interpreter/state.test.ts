import { describe, expect, test } from 'bun:test';
import { idleSnapshot } from '../../lib/interpreter';
import { mapFrom, machineFrom, finish } from '../support/harness';

describe('integration / simulation snapshots, independent runs, and reset (PDF §3.4)', () => {
  test('empty program is already done without consuming a line', () => expect(machineFrom('').snapshot()).toMatchObject({ status: 'done', steps: 0, line: null, error: null, output: [], variables: [] }));
  test('idle snapshot contains the untouched starting state', () => {
    const map = mapFrom(); const idle = idleSnapshot(map);
    expect(idle).toMatchObject({ status: 'idle', steps: 0, line: null, mined: 0, error: null, output: [], variables: [] });
    expect(idle.robot).toEqual(map.robot); expect(idle.gold).toEqual(map.gold);
    expect(idle.explored.filter(Boolean)).toHaveLength(1);
  });
  test('one step advances one source line, not the entire program', () => {
    const machine = machineFrom('set x to 3\nstep forward x\nprint x');
    machine.step(); expect(machine.snapshot()).toMatchObject({ steps: 1, line: 1, output: [], variables: [['x', 3]], robot: { x: 0, y: 1 } });
    machine.step(); expect(machine.snapshot()).toMatchObject({ steps: 2, line: 2, robot: { x: 3, y: 1 }, status: 'running' });
    machine.step(); expect(machine.snapshot()).toMatchObject({ steps: 3, line: 3, output: ['3'], status: 'done' });
  });
  for (const code of ['print 1', 'mine here']) test(`terminal state is stable: ${code}`, () => {
    const machine = machineFrom(code); const final = finish(machine);
    for (let i = 0; i < 5; i++) machine.step();
    expect(machine.snapshot()).toEqual(final);
  });
  test('running a program never mutates the source map', () => {
    const map = mapFrom(); const before = structuredClone(map);
    finish(machineFrom('step forward 2\nmine here\nturn by 2', map));
    expect(map).toEqual(before);
  });
  test('reset by creating a new machine restores map, gold, variables, counters, and fog', () => {
    const map = mapFrom(); const initial = machineFrom('step forward 2\nmine here\nset x to 1', map).snapshot();
    const first = finish(machineFrom('step forward 2\nmine here\nset x to 1', map));
    expect(first.mined).toBe(1);
    expect(machineFrom('step forward 2\nmine here\nset x to 1', map).snapshot()).toEqual(initial);
  });
  test('two interleaved machines sharing a map do not share mutable state', () => {
    const map = mapFrom();
    const a = machineFrom('step forward 2\nmine here\nset x to 1', map);
    const b = machineFrom('print 7', map);
    a.step(); b.step(); a.step();
    expect(b.snapshot()).toMatchObject({ robot: map.robot, gold: map.gold, mined: 0, output: ['7'], variables: [] });
    expect(a.snapshot()).toMatchObject({ mined: 1, output: [] });
  });
  test('previous snapshots do not change when the machine advances', () => {
    const machine = machineFrom('step forward 2\nmine here\nset x to 3\nprint x');
    const initial = machine.snapshot(); const copy = structuredClone(initial);
    finish(machine); expect(initial).toEqual(copy);
  });
  test('mutating snapshot collections cannot change engine state', () => {
    const machine = machineFrom('set x to 1\nprint x'); machine.step();
    const snapshot = machine.snapshot();
    snapshot.robot.x = 9; snapshot.gold.fill(false); snapshot.explored.fill(true); snapshot.output.push('fake'); snapshot.variables[0][1] = false;
    const final = finish(machine);
    expect(final).toMatchObject({ output: ['1'], variables: [['x', 1]], robot: { x: 0, y: 1, dir: 3 }, mined: 0 });
    expect(final.gold.filter(Boolean)).toHaveLength(3); expect(final.explored.filter(Boolean)).toHaveLength(1);
  });
  test('repeated execution is deterministic', () => {
    const code = 'set n to 2\nstep forward n\nmine here\nprint n';
    expect(finish(machineFrom(code))).toEqual(finish(machineFrom(code)));
  });
});
