// A térképszerkesztő tiszta műveletei (React és DOM nélkül): új térkép, szöveggé alakítás, átméretezés,
// mezők festése és a szerkesztett dokumentum állapota. Az érvényességet mindig a parseMap dönti el,
// ugyanaz, amelyik a szimulátor importját is ellenőrzi.

import { fileBaseName, fileNameWith, DEFAULT_FILE_NAME } from "./file-names";
import { MAX_MAP_SIZE } from "./limits";
import { cellIndex, parseMap, ROBOT_SYMBOLS, type Direction, type GameMap, type MapParseResult } from "./robot-map";

export const MAP_EXTENSION = ".map";

/** A szerkeszthető térképnév: kiterjesztés nélkül (az importált .txt-t is levágja), tiltott jelek nélkül. */
export const mapName = (text: string) => fileBaseName(text, [MAP_EXTENSION, ".txt"]);

/** A letöltött térkép neve: mindig .map kiterjesztéssel, üres névnél „untitled.map”. */
export const mapFilename = (name: string) => fileNameWith(name, MAP_EXTENSION);
export const DEFAULT_MAP_SIZE = 8;
/** A szerkesztő ecsetjei; az üres ecset kamrát hagy (fal és arany nélkül). */
export const MAP_TOOLS = ["empty", "gold", "wall", "robot"] as const;
export type MapTool = (typeof MAP_TOOLS)[number];

/** Érvényes sor- vagy oszlopszám: egész 1 és MAX_MAP_SIZE között. */
export const isValidMapSize = (size: number) => Number.isInteger(size) && size >= 1 && size <= MAX_MAP_SIZE;

function checkDimensions(rows: number, cols: number) {
  if (!isValidMapSize(rows) || !isValidMapSize(cols)) {
    throw new RangeError(`Map dimensions must be integers between 1 and ${MAX_MAP_SIZE}.`);
  }
}

/** Üres térkép, a robot a bal felső sarokban kelet felé néz. */
export function createMap(rows = DEFAULT_MAP_SIZE, cols = DEFAULT_MAP_SIZE): GameMap {
  checkDimensions(rows, cols);
  return {
    rows,
    cols,
    walls: Array(rows * cols).fill(false),
    gold: Array(rows * cols).fill(false),
    robot: { x: 0, y: 0, dir: 3 },
  };
}

/** A térkép fájlformátuma (parseMap inverze): fejléc „sorok oszlopok”, majd soronként pontosan `cols` jel. */
export function formatMap(map: GameMap): string {
  const rows = Array.from({ length: map.rows }, (_, y) =>
    Array.from({ length: map.cols }, (_, x) => {
      const index = cellIndex(map, x, y);
      if (x === map.robot.x && y === map.robot.y) return ROBOT_SYMBOLS[map.robot.dir];
      return map.walls[index] ? "#" : map.gold[index] ? "@" : ".";
    }).join(""),
  );
  return [`${map.rows} ${map.cols}`, ...rows].join("\n");
}

/** Átméretezéskor a közös terület megmarad; a kilógó robot a legközelebbi megmaradó üres mezőre kerül. */
export function resizeMap(map: GameMap, rows: number, cols: number): GameMap {
  const resized = createMap(rows, cols);
  for (let y = 0; y < Math.min(rows, map.rows); y++) {
    for (let x = 0; x < Math.min(cols, map.cols); x++) {
      const previous = cellIndex(map, x, y);
      const next = cellIndex(resized, x, y);
      resized.walls[next] = map.walls[previous];
      resized.gold[next] = map.gold[previous];
    }
  }
  resized.robot = { x: Math.min(map.robot.x, cols - 1), y: Math.min(map.robot.y, rows - 1), dir: map.robot.dir };
  const start = cellIndex(resized, resized.robot.x, resized.robot.y);
  resized.walls[start] = false;
  resized.gold[start] = false;
  return resized;
}

/** Fal vagy arany nem kerülhet a robotra. A robot áthelyezése kiüríti a célmezőt. */
export function paintCell(
  map: GameMap,
  x: number,
  y: number,
  tool: MapTool,
  direction: Direction = map.robot.dir,
): GameMap {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.cols || y >= map.rows) return map;
  const atRobot = x === map.robot.x && y === map.robot.y;
  if (atRobot && (tool === "wall" || tool === "gold")) return map;
  const result = { ...map, walls: [...map.walls], gold: [...map.gold], robot: { ...map.robot } };
  const index = cellIndex(map, x, y);
  result.walls[index] = tool === "wall";
  result.gold[index] = tool === "gold";
  if (tool === "robot") result.robot = { x, y, dir: direction };
  return result;
}

/** A szerkesztett térképfájl: a forrásszöveg, a név (kiterjesztés nélkül), az ellenőrzés és a rajzolt előnézet. */
export type MapDocument = {
  source: string;
  name: string;
  preview: GameMap;
  validation: MapParseResult;
};

/** Hibás kézi szerkesztésnél a szöveg megmarad, a rajz az utolsó érvényes térképet mutatja. */
export function updateMapDocument(document: MapDocument, source: string): MapDocument {
  const validation = parseMap(source);
  return { ...document, source, validation, preview: validation.ok ? validation.map : document.preview };
}

export function createMapDocument(source = formatMap(createMap()), name = DEFAULT_FILE_NAME): MapDocument {
  const empty = { source: "", name, preview: createMap(), validation: { ok: false, error: "" } } as const;
  return updateMapDocument(empty, source);
}

/** Hibás import sem a szöveget, sem a nevet, sem az előnézetet nem írja felül. */
export function importMapDocument(document: MapDocument, source: string, filename: string) {
  const validation = parseMap(source);
  if (!validation.ok) return { ok: false as const, error: validation.error };
  const imported = { source, name: mapName(filename), preview: validation.map, validation };
  return { ok: true as const, document: imported };
}
