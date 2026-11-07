import { describe, expect, test } from "bun:test";
import { mapTile, TILES } from "../../components/sprites";

// PDF 3.4: a felfedezett mezők (amelyeken a robot járt, vagy amelyekre isThere hívódott) elkülönülnek a
// feltérképezetlenektől. A falra csak isThere-rel lehet „ránézni”, ezért a falnak is két képe van.
describe("map tiles / explored cells are distinguishable", () => {
  test("without fog every cell shows its content, explored or not", () => {
    expect(mapTile(false, true)).toBe(TILES.dug);
    expect(mapTile(false, false)).toBe(TILES.solid);
    expect(mapTile(true, true)).toBe(TILES.wall);
    expect(mapTile(true, false)).toBe(TILES.unexploredWall);
  });

  test("an explored and an unexplored cell never share a tile, for walls and chambers alike", () => {
    for (const wall of [true, false]) expect(mapTile(wall, true)).not.toBe(mapTile(wall, false));
  });

  test("fog hides the content of unexplored cells but not of explored ones", () => {
    expect(mapTile(true, false, true)).toBe(TILES.solid);
    expect(mapTile(false, false, true)).toBe(TILES.solid);
    expect(mapTile(true, true, true)).toBe(TILES.wall);
    expect(mapTile(false, true, true)).toBe(TILES.dug);
  });
});
