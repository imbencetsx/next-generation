// A térkép modellje, a térképfájl beolvasása (kiírás 1. fejezet) és a beépített pályák.
//
// Fájlformátum: az első sor „<sorok> <oszlopok>” (1–15), utána soronként a mezők:
//   .  üres kamra   @  arany   #  fal   > < ^ v  a robot (kelet, nyugat, észak, dél felé néz)
// Pontosan egy robot kell; a mezőjén nincs arany, mert a jele foglalja a mezőt.
// Hibás fájlból soha nem adunk vissza térképet.

import { plural } from "./diagnostics";
import { MAX_MAP_SIZE } from "./limits";

/** Az irányok sorrendje: az index növelése egy balra (az óramutatóval ellentétes) fordulás. */
// Képernyő-koordináták: a 0. sor felül van, az y lefelé növekszik.
export const DIRECTIONS = [
  { name: "north", dx: 0, dy: -1 },
  { name: "west", dx: -1, dy: 0 },
  { name: "south", dx: 0, dy: 1 },
  { name: "east", dx: 1, dy: 0 },
] as const;
/** Index a DIRECTIONS tömbbe: 0 észak, 1 nyugat, 2 dél, 3 kelet. */
export type Direction = 0 | 1 | 2 | 3;

/** A mezők sorfolytonos tömbökben vannak: az (x, y) mező indexe y * cols + x. */
export type GameMap = {
  rows: number;
  cols: number;
  walls: boolean[];
  gold: boolean[];
  robot: { x: number; y: number; dir: Direction };
};

/** Hibánál `line` a térképfájl 1-től számozott sora, `column` az oszlop, ha egy konkrét helyről van szó. */
export type MapParseResult = { ok: true; map: GameMap } | { ok: false; error: string; line?: number; column?: number };

const ROBOT_SYMBOLS: Record<string, Direction> = { "^": 0, "<": 1, "v": 2, ">": 3 };
const MAP_SYMBOL = /^[.@#^<>v]$/;

/** Miért nem térképjel egy karakter (a hibaüzenetbe). */
function symbolProblem(symbol: string): string {
  const code = `U+${symbol.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
  if (symbol === " " || symbol === "\t") {
    return `a ${symbol === " " ? "space" : "tab"} is not a map symbol (use . for an empty chamber)`;
  }
  if (symbol === "V") return "unknown symbol “V” (the south-facing robot is a lowercase v)";
  if (/\s/.test(symbol)) return `an invisible character ${code}`;
  return `unknown symbol “${symbol}” (${code})`;
}

/** Egy térképfájl-hiba; a parseMap alakítja eredménnyé. A `line` és `column` 1-től számozott. */
class MapFileError extends Error {
  constructor(
    message: string,
    readonly line?: number,
    readonly column?: number,
  ) {
    super(message);
  }
}

/** Térkép beolvasása fájlszövegből. Csak teljesen érvényes fájlból ad vissza térképet; különben az első hibát. */
export function parseMap(text: string): MapParseResult {
  try {
    return { ok: true, map: readMapFile(text) };
  } catch (error) {
    if (!(error instanceof MapFileError)) throw error;
    const { message, line, column } = error;
    return {
      ok: false,
      ...(line === undefined ? {} : { line }),
      ...(column === undefined ? {} : { column }),
      error: message,
    };
  }
}

function readMapFile(text: string): GameMap {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // A fájl végi sortörés nem üres térképsor.
  if (lines.at(-1) === "") lines.pop();

  const { rows, cols } = readHeader(lines[0]);
  checkRowCount(lines.length - 1, rows);
  return readGrid(lines.slice(1), rows, cols);
}

/** Az első sor: „<sorok> <oszlopok>”, pontosan egy szóközzel, mindkettő 1 és MAX_MAP_SIZE között. */
function readHeader(header: string | undefined): { rows: number; cols: number } {
  const match = /^(\d+) (\d+)$/.exec(header ?? "");
  if (!match) {
    throw new MapFileError(
      `Line 1 must be the map size as "<rows> <columns>" with exactly one space, e.g. "3 15" (found ${JSON.stringify(header ?? "")}).`,
      1,
    );
  }
  const rows = Number(match[1]);
  const cols = Number(match[2]);
  const fits = (size: number) => size >= 1 && size <= MAX_MAP_SIZE;
  if (!fits(rows) || !fits(cols)) {
    throw new MapFileError(
      `Line 1: both dimensions must be between 1 and ${MAX_MAP_SIZE} (found ${rows} rows and ${cols} columns).`,
      1,
    );
  }
  return { rows, cols };
}

function checkRowCount(found: number, rows: number) {
  if (found === rows) return;
  throw new MapFileError(
    `The header (line 1) declares ${plural(rows, "row")}, but the file contains ${plural(found, "map line")}${found > rows ? ` (line ${rows + 2} is extra)` : ""}.`,
    // Hiányzó sornál az utolsó meglévő sor után, fölösleges sornál az első fölösleges sorra mutatunk.
    found < rows ? found + 1 : rows + 2,
  );
}

/** A térképsorok mezőnként; pontosan egy robotot keres. A fájlbeli sorszám a térképsor indexe + 2. */
function readGrid(rowTexts: string[], rows: number, cols: number): GameMap {
  const walls: boolean[] = [];
  const gold: boolean[] = [];
  let robot: (GameMap["robot"] & { line: number; column: number }) | null = null;

  for (let y = 0; y < rows; y++) {
    const row = rowTexts[y];
    const line = y + 2;
    if (row.length !== cols) {
      const difference = row.length - cols;
      throw new MapFileError(
        `Line ${line} has ${row.length} characters but the header declares ${cols} columns (${difference > 0 ? `${difference} too many` : `${-difference} missing`}).`,
        line,
      );
    }

    for (let x = 0; x < cols; x++) {
      const symbol = row[x];
      const column = x + 1;
      if (!MAP_SYMBOL.test(symbol)) {
        throw new MapFileError(
          `Line ${line}, column ${column}: ${symbolProblem(symbol)}. Allowed symbols: . @ # > < ^ v`,
          line,
          column,
        );
      }
      walls.push(symbol === "#");
      gold.push(symbol === "@");
      if (!(symbol in ROBOT_SYMBOLS)) continue;

      if (robot) {
        throw new MapFileError(
          `Line ${line}, column ${column}: a second robot. The map must contain exactly one robot; the first one is on line ${robot.line}, column ${robot.column}.`,
          line,
          column,
        );
      }
      robot = { x, y, dir: ROBOT_SYMBOLS[symbol], line, column };
    }
  }

  if (!robot) {
    throw new MapFileError(
      "The map has no robot. Place exactly one robot: > < ^ or v (facing east, west, north or south).",
    );
  }
  return { rows, cols, walls, gold, robot: { x: robot.x, y: robot.y, dir: robot.dir } };
}

/** Az (x, y) mező indexe a sorfolytonos tömbökben (walls, gold, explored). */
export const cellIndex = (map: Pick<GameMap, "cols">, x: number, y: number) => y * map.cols + x;

/** Egy sorfolytonos index mezője. */
export const cellAt = (map: Pick<GameMap, "cols">, index: number) => ({
  x: index % map.cols,
  y: Math.floor(index / map.cols),
});

/** A beépített pályák; a nevük egyben fordítási kulcs is (sim.maps). */
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

/** Egy beépített pálya térképként. Hibás beépített pálya programozási hiba, ezért kivételt dob. */
export function presetMap(index: number): GameMap {
  const result = parseMap(MAP_PRESETS[index].text);
  if (!result.ok) throw new Error(`Invalid built-in map "${MAP_PRESETS[index].name}": ${result.error}`);
  return result.map;
}
