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

/** Hibánál `line` a térképfájl 1-től számozott sora, `column` az oszlop, ha egy konkrét helyről van szó. */
export type MapParseResult =
  | { ok: true; map: GameMap }
  | { ok: false; error: string; line?: number; column?: number };

const ROBOT_SYMBOLS: Record<string, Direction> = { "^": 0, "<": 1, v: 2, ">": 3 };
const MAX_SIZE = 15;

function symbolProblem(symbol: string): string {
  const code = `U+${symbol.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
  if (symbol === " " || symbol === "\t") return `a ${symbol === " " ? "space" : "tab"} is not a map symbol (use . for an empty chamber)`;
  if (symbol === "V") return "unknown symbol “V” (the south-facing robot is a lowercase v)";
  if (/\s/.test(symbol)) return `an invisible character ${code}`;
  return `unknown symbol “${symbol}” (${code})`;
}

// Csak teljesen érvényes fájlból adunk vissza térképet.
export function parseMap(text: string): MapParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();

  const header = /^(\d+) (\d+)$/.exec(lines[0] ?? "");
  if (!header) {
    return {
      ok: false, line: 1,
      error: `Line 1 must be the map size as "<rows> <columns>" with exactly one space, e.g. "3 15" (found ${JSON.stringify(lines[0] ?? "")}).`,
    };
  }
  const rows = Number(header[1]);
  const cols = Number(header[2]);
  if (rows < 1 || rows > MAX_SIZE || cols < 1 || cols > MAX_SIZE) {
    return { ok: false, line: 1, error: `Line 1: both dimensions must be between 1 and ${MAX_SIZE} (found ${rows} rows and ${cols} columns).` };
  }
  if (lines.length - 1 !== rows) {
    const found = lines.length - 1;
    return {
      ok: false,
      line: found < rows ? lines.length : rows + 2,
      error: `The header (line 1) declares ${rows} row${rows === 1 ? "" : "s"}, but the file contains ${found} map line${found === 1 ? "" : "s"}${found > rows ? ` (line ${rows + 2} is extra)` : ""}.`,
    };
  }

  const walls: boolean[] = [];
  const gold: boolean[] = [];
  let robot: (GameMap["robot"] & { line: number; column: number }) | null = null;
  for (let y = 0; y < rows; y++) {
    const row = lines[y + 1];
    const line = y + 2;
    if (row.length !== cols) {
      const difference = row.length - cols;
      return {
        ok: false, line,
        error: `Line ${line} has ${row.length} characters but the header declares ${cols} columns (${difference > 0 ? `${difference} too many` : `${-difference} missing`}).`,
      };
    }
    for (let x = 0; x < cols; x++) {
      const symbol = row[x];
      if (!/^[.@#^<>v]$/.test(symbol)) {
        return { ok: false, line, column: x + 1, error: `Line ${line}, column ${x + 1}: ${symbolProblem(symbol)}. Allowed symbols: . @ # > < ^ v` };
      }
      walls.push(symbol === "#");
      gold.push(symbol === "@");
      if (symbol in ROBOT_SYMBOLS) {
        if (robot) {
          return {
            ok: false, line, column: x + 1,
            error: `Line ${line}, column ${x + 1}: a second robot. The map must contain exactly one robot; the first one is on line ${robot.line}, column ${robot.column}.`,
          };
        }
        robot = { x, y, dir: ROBOT_SYMBOLS[symbol], line, column: x + 1 };
      }
    }
  }
  if (!robot) return { ok: false, error: "The map has no robot. Place exactly one robot: > < ^ or v (facing east, west, north or south)." };
  return { ok: true, map: { rows, cols, walls, gold, robot: { x: robot.x, y: robot.y, dir: robot.dir } } };
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
