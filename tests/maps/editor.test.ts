import { describe, expect, test } from "bun:test";
import {
  createMap,
  createMapDocument,
  formatMap,
  importMapDocument,
  paintCell,
  resizeMap,
  mapFilename,
  mapName,
  updateMapDocument,
} from "../../lib/map-editor";
import { parseMap, type Direction } from "../../lib/robot-map";

describe("map editing / file round trips", () => {
  test("every legal size and direction round-trips to the required format", () => {
    for (let rows = 1; rows <= 15; rows++) {
      for (let cols = 1; cols <= 15; cols++) {
        for (const dir of [0, 1, 2, 3] as Direction[]) {
          const map = createMap(rows, cols);
          map.robot.dir = dir;
          const source = formatMap(map);
          expect(source.split("\n")[0]).toBe(`${rows} ${cols}`);
          expect(
            source
              .split("\n")
              .slice(1)
              .every((row) => row.length === cols),
          ).toBe(true);
          expect(parseMap(source)).toEqual({ ok: true, map });
        }
      }
    }
  });
  test("rejects invalid dimensions", () => {
    for (const size of [0, 16, -1, 1.5, NaN]) {
      expect(() => createMap(size, 3)).toThrow();
      expect(() => resizeMap(createMap(), 3, size)).toThrow();
    }
  });
  test("painting preserves the original and moves the single robot onto an empty chamber", () => {
    const original = createMap(2, 3);
    const gold = paintCell(original, 2, 1, "gold");
    expect(original.gold).toEqual([false, false, false, false, false, false]);
    expect(gold.gold[5]).toBe(true);
    const moved = paintCell(gold, 2, 1, "robot", 0);
    expect(moved.robot).toEqual({ x: 2, y: 1, dir: 0 });
    expect(moved.gold[5]).toBe(false);
    expect(formatMap(moved)).toBe("2 3\n...\n..^");
    expect(paintCell(moved, 2, 1, "wall")).toBe(moved);
    expect(paintCell(moved, 2, 1, "gold")).toBe(moved);
    expect(paintCell(moved, -1, 0, "wall")).toBe(moved);
  });
  test("all brushes replace the previous tile without leaving overlapping wall and gold", () => {
    const wall = paintCell(createMap(1, 2), 1, 0, "wall");
    expect(wall.walls[1]).toBe(true);
    const gold = paintCell(wall, 1, 0, "gold");
    expect(gold.walls[1]).toBe(false);
    expect(gold.gold[1]).toBe(true);
    expect(formatMap(paintCell(gold, 1, 0, "empty"))).toBe("1 2\n>.");
  });
  test("resizing preserves coordinates, pads empty cells and relocates an out-of-bounds robot", () => {
    const parsed = parseMap("3 3\n@#.\n...\n..v");
    if (!parsed.ok) throw new Error(parsed.error);
    const smaller = resizeMap(parsed.map, 1, 2);
    expect(formatMap(smaller)).toBe("1 2\n@v");
    expect(formatMap(resizeMap(smaller, 2, 3))).toBe("2 3\n@v.\n...");
    expect(formatMap(parsed.map)).toBe("3 3\n@#.\n...\n..v");
  });
  test("an invalid draft keeps the last valid preview, then recovers", () => {
    const original = createMapDocument("1 2\n>@", "mine");
    const invalid = updateMapDocument(original, "1 2\n@@");
    expect(invalid.validation.ok).toBe(false);
    expect(invalid.source).toBe("1 2\n@@");
    expect(invalid.preview).toBe(original.preview);
    expect(updateMapDocument(invalid, "1 1\n^").validation.ok).toBe(true);
  });
  test("broken imports never replace an existing document, valid imports take the file's name", () => {
    const original = createMapDocument("1 1\n>", "old");
    expect(importMapDocument(original, "1 1\n@", "broken.map").ok).toBe(false);
    expect(original.name).toBe("old");
    expect(original.source).toBe("1 1\n>");
    const imported = importMapDocument(original, "1 2\n>@\n", "new.map");
    expect(imported.ok).toBe(true);
    if (imported.ok) expect(imported.document.name).toBe("new");
  });
  test("the editable map name drops .map or an imported .txt, and exports always end in .map", () => {
    expect(mapName("corridor.map")).toBe("corridor");
    expect(mapName("Rooms.MAP")).toBe("Rooms");
    expect(mapName("level.txt")).toBe("level");
    expect(mapName("a/b:c.map")).toBe("abc");
    expect(mapFilename("corridor")).toBe("corridor.map");
    expect(mapFilename(" ")).toBe("untitled.map");
  });
});
