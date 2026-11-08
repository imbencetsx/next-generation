/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";
const page = { numItems: 20, cursor: null };

/** Két bejelentkezett felhasználó (érvényes munkamenettel) és egy kijelentkezett hívó. */
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const minerId = await ctx.db.insert("users", { name: "miner" });
    const otherId = await ctx.db.insert("users", { name: "other" });
    const minerSession = await ctx.db.insert("authSessions", { userId: minerId, expirationTime: Date.now() + 60_000 });
    const otherSession = await ctx.db.insert("authSessions", { userId: otherId, expirationTime: Date.now() + 60_000 });
    return { minerId, otherId, minerSession, otherSession };
  });
  const miner = t.withIdentity({ subject: `${ids.minerId}|${ids.minerSession}` });
  const other = t.withIdentity({ subject: `${ids.otherId}|${ids.otherSession}` });
  return { t, miner, other };
}

describe("published maps", () => {
  test("a valid map is stored normalized, with its size and gold count, and listed with its author", async () => {
    const { miner, other } = await setup();
    await miner.mutation(api.maps.publish, { name: "  corridor.map ", text: `${CORRIDOR.replaceAll("\n", "\r\n")}\n` });
    const [map] = (await other.query(api.maps.list, { paginationOpts: page, mine: false })).page;
    expect(map).toMatchObject({ name: "corridor", text: CORRIDOR, rows: 3, cols: 10, goldCount: 3 });
    expect(map.authorName).toBe("miner");
    expect(map.isMine).toBe(false);
  });

  test("the list is newest first, and mine filters to the caller's own maps", async () => {
    const { miner, other } = await setup();
    await miner.mutation(api.maps.publish, { name: "first", text: "1 1\n>" });
    await other.mutation(api.maps.publish, { name: "second", text: "1 1\n<" });
    await miner.mutation(api.maps.publish, { name: "third", text: "1 1\n^" });
    const all = (await miner.query(api.maps.list, { paginationOpts: page, mine: false })).page;
    expect(all.map((map) => map.name)).toEqual(["third", "second", "first"]);
    expect(all.map((map) => map.isMine)).toEqual([true, false, true]);
    const mine = (await miner.query(api.maps.list, { paginationOpts: page, mine: true })).page;
    expect(mine.map((map) => map.name)).toEqual(["third", "first"]);
  });

  test("invalid maps, names and signed-out callers are rejected with codes", async () => {
    const { t, miner } = await setup();
    await expect(miner.mutation(api.maps.publish, { name: "gold", text: "1 1\n@" })).rejects.toThrow("MAP_invalid");
    await expect(miner.mutation(api.maps.publish, { name: " .map ", text: "1 1\n>" })).rejects.toThrow("MAP_name");
    await expect(miner.mutation(api.maps.publish, { name: "x".repeat(61), text: "1 1\n>" })).rejects.toThrow(
      "MAP_name",
    );
    await expect(t.mutation(api.maps.publish, { name: "anon", text: "1 1\n>" })).rejects.toThrow("MAP_unauthenticated");
    expect((await t.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
  });

  test("only the owner can delete a map", async () => {
    const { miner, other } = await setup();
    const mapId = await miner.mutation(api.maps.publish, { name: "mine", text: "1 1\n>" });
    await expect(other.mutation(api.maps.remove, { mapId })).rejects.toThrow("MAP_forbidden");
    await miner.mutation(api.maps.remove, { mapId });
    expect((await other.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
    await expect(miner.mutation(api.maps.remove, { mapId })).rejects.toThrow("MAP_notFound");
  });

  test("one map can be fetched by its id from the URL; a bad or deleted id gives null", async () => {
    const { t, miner, other } = await setup();
    const mapId = await miner.mutation(api.maps.publish, { name: "single", text: "1 1\n>" });
    expect(await other.query(api.maps.get, { mapId })).toMatchObject({
      name: "single",
      authorName: "miner",
      isMine: false,
    });
    expect(await other.query(api.maps.get, { mapId: "not-an-id" })).toBeNull();
    expect(await t.query(api.maps.get, { mapId })).toBeNull();
    await miner.mutation(api.maps.remove, { mapId });
    expect(await other.query(api.maps.get, { mapId })).toBeNull();
  });
});
