// A motortesztek közös segédei: térkép és gép építése, futtatás a végéig, lépésenkénti állapotok rögzítése.

import { Machine, parseProgram, type Snapshot } from "../../lib/interpreter";
import { parseMap, type GameMap } from "../../lib/robot-map";

/**
 * Biztosíték a léptető ciklusokhoz. A kiírás 1000 feldolgozott sort enged; az 1001. hívásnak
 * INSTRUCTION_COUNT_LIMIT_EXCEEDED hibával kell megállnia. Ha a motor korlátja elromlana, ez állítja meg
 * a tesztet, hogy a tesztsor ne akadjon el. Szándékosan nem a motorból importáljuk: független ellenőrzés.
 */
const STEP_CALL_FUSE = 1002;

export const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";
export const SPEC_MAP = "3 15\n....@..........\n.#############.\n.......@...>...";
export const EMPTY_MAP = "1 1\n>";

/** Tesztpálya beolvasása; hibás pálya a teszt hibája, ezért kivételt dob. */
export function mapFrom(text = CORRIDOR): GameMap {
  const parsed = parseMap(text);
  if (!parsed.ok) throw new Error(`Invalid test map: ${parsed.error}`);
  return parsed.map;
}

/** Új gép egy programhoz, amelynek szintaktikailag helyesnek kell lennie. */
export function machineFrom(code: string, map: GameMap = mapFrom()): Machine {
  const parsed = parseProgram(code);
  if (!parsed.ok) throw new Error(`Invalid test program: ${JSON.stringify(parsed.issues)}\n${code}`);
  return new Machine(parsed.program, map);
}

/** Futtatás a végéig; csak a végállapotot adja vissza (a ciklusban nem készít pillanatképet). */
export function finish(machine: Machine): Snapshot {
  for (let calls = 0; machine.status === "running"; calls++) {
    if (calls >= STEP_CALL_FUSE) {
      throw new Error(`Harness fuse: engine did not terminate after ${STEP_CALL_FUSE} step calls`);
    }
    machine.step();
  }
  return machine.snapshot();
}

export function run(code: string, map = CORRIDOR): Snapshot {
  return finish(machineFrom(code, mapFrom(map)));
}

/** Minden közbülső pillanatkép, feldolgozott soronként egy; az állapotok sorrendjét vizsgáló tesztekhez. */
export function trace(code: string, map = CORRIDOR): Snapshot[] {
  const machine = machineFrom(code, mapFrom(map));
  const states: Snapshot[] = [];
  for (let calls = 0; machine.status === "running"; calls++) {
    if (calls >= STEP_CALL_FUSE) throw new Error("Trace fuse: execution did not terminate");
    machine.step();
    states.push(machine.snapshot());
  }
  return states;
}

/** Egy sorfolytonos logikai rács igaz mezői „x,y” alakban (olvasható összevetésekhez). */
export function coordinates(bits: boolean[], cols: number): string[] {
  return bits.flatMap((present, i) => (present ? [`${i % cols},${Math.floor(i / cols)}`] : []));
}
