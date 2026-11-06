// Térképfájlok beolvasása és a beépített pályák.

// Ebben a sorrendben az irány növelése egy balra fordulást jelent.
export const DIRECTIONS = [
  { name: "north", dx: 0, dy: -1 },
  { name: "west", dx: -1, dy: 0 },
  { name: "south", dx: 0, dy: 1 },
  { name: "east", dx: 1, dy: 0 },
] as const;
export type Direction = 0 | 1 | 2 | 3;

export type GameMap = {
  rows: number;
  cols: number;
  walls: boolean[];
  gold: boolean[];
  robot: { x: number; y: number; dir: Direction };
};

export type MapParseResult = { ok: true; map: GameMap } | { ok: false; error: string };

const ROBOT_SYMBOLS: Record<string, Direction> = { "^": 0, "<": 1, v: 2, ">": 3 };
const MAX_SIZE = 15;

// Csak teljesen érvényes fájlból adunk vissza térképet.
export function parseMap(text: string): MapParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();

  const header = /^(\d+) (\d+)$/.exec(lines[0] ?? "");
  if (!header) return { ok: false, error: 'Line 1 must be the map size: "<rows> <columns>", e.g. "3 15".' };
  const rows = Number(header[1]);
  const cols = Number(header[2]);
  if (rows < 1 || rows > MAX_SIZE || cols < 1 || cols > MAX_SIZE) {
    return { ok: false, error: `Both dimensions must be between 1 and ${MAX_SIZE}.` };
  }
  if (lines.length - 1 !== rows) {
    return { ok: false, error: `The header declares ${rows} rows but the file contains ${lines.length - 1}.` };
  }

  const walls: boolean[] = [];
  const gold: boolean[] = [];
  let robot: GameMap["robot"] | null = null;
  for (let y = 0; y < rows; y++) {
    const row = lines[y + 1];
    if (row.length !== cols) {
      return { ok: false, error: `Line ${y + 2} has ${row.length} characters but the header declares ${cols} columns.` };
    }
    for (let x = 0; x < cols; x++) {
      const symbol = row[x];
      if (!/^[.@#^<>v]$/.test(symbol)) {
        return { ok: false, error: `Line ${y + 2}, column ${x + 1}: unknown symbol “${symbol}”. Use . @ # > < ^ v.` };
      }
      walls.push(symbol === "#");
      gold.push(symbol === "@");
      if (symbol in ROBOT_SYMBOLS) {
        if (robot) return { ok: false, error: `Line ${y + 2}: the map must contain exactly one robot.` };
        robot = { x, y, dir: ROBOT_SYMBOLS[symbol] };
      }
    }
  }
  if (!robot) return { ok: false, error: "The map must contain exactly one robot (> < ^ v)." };
  return { ok: true, map: { rows, cols, walls, gold, robot } };
}

export const MAP_PRESETS = [
  {
    name: "Corridor",
    text: `3 10
##########
>.@..@.@.#
##########`,
  },
  {
    name: "Rooms",
    text: `7 12
############
#.....#..@.#
#.@...#....#
#>....#.#..#
#.....@.#@.#
#..@..#....#
############`,
  },
  {
    name: "Open field",
    text: `5 8
........
..@.....
.>....@.
......@.
.@......`,
  },
];

export function presetMap(index: number): GameMap {
  const result = parseMap(MAP_PRESETS[index].text);
  if (!result.ok) throw new Error(`Invalid built-in map "${MAP_PRESETS[index].name}": ${result.error}`);
  return result.map;
}
