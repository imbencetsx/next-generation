/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";

// A Corridor pálya aranyai a 3., 6. és 8. oszlopban vannak; a robot az 1. oszlopból kelet felé indul.
const ONE_GOLD = "step forward 2\nmine here"; // 1 arany, 2 sor
const ONE_GOLD_SLOW = "print 0\nstep forward 2\nmine here"; // 1 arany, 3 sor
const TWO_GOLD = "step forward 2\nmine here\nstep forward 3\nmine here"; // 2 arany, 4 sor
const ERRORS_AFTER_GOLD = "step forward 2\nmine here\nmine here"; // 1 arany, 3 sor, E_NO_GOLD

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
  const mapId = await t.run((ctx) =>
    ctx.db.insert("maps", { ownerId: ids.otherId, name: "corridor", text: CORRIDOR, rows: 3, cols: 10, goldCount: 3 }),
  );
  return { t, miner, other, mapId };
}

describe("run results on published maps", () => {
  test("the server runs the program itself and stores the first result as the best", async () => {
    const { miner, mapId } = await setup();
    const result = await miner.mutation(api.results.record, { mapId, code: ONE_GOLD });
    expect(result).toEqual({
      run: { gold: 1, steps: 2, errorCode: null },
      best: { gold: 1, steps: 2 },
      improved: true,
    });
    expect(await miner.query(api.results.myBest, { mapId })).toEqual({ gold: 1, steps: 2 });
  });

  test("only a better result replaces the best: more gold, or the same gold in fewer steps", async () => {
    const { miner, mapId } = await setup();
    await miner.mutation(api.results.record, { mapId, code: ONE_GOLD_SLOW });
    const fewerSteps = await miner.mutation(api.results.record, { mapId, code: ONE_GOLD });
    expect(fewerSteps.improved).toBe(true);
    const tie = await miner.mutation(api.results.record, { mapId, code: ONE_GOLD });
    expect(tie).toMatchObject({ improved: false, best: { gold: 1, steps: 2 } });
    const worse = await miner.mutation(api.results.record, { mapId, code: ONE_GOLD_SLOW });
    expect(worse).toMatchObject({ run: { gold: 1, steps: 3 }, improved: false, best: { gold: 1, steps: 2 } });
    const moreGold = await miner.mutation(api.results.record, { mapId, code: TWO_GOLD });
    expect(moreGold).toMatchObject({ improved: true, best: { gold: 2, steps: 4 } });
    expect(await miner.query(api.results.myBest, { mapId })).toEqual({ gold: 2, steps: 4 });
  });

  test("a run that ends with a runtime error is recorded with the gold mined before the error", async () => {
    const { miner, mapId } = await setup();
    const result = await miner.mutation(api.results.record, { mapId, code: ERRORS_AFTER_GOLD });
    expect(result.run).toEqual({ gold: 1, steps: 3, errorCode: "E_NO_GOLD" });
    expect(result.improved).toBe(true);
  });

  test("each player has their own best", async () => {
    const { miner, other, mapId } = await setup();
    await miner.mutation(api.results.record, { mapId, code: TWO_GOLD });
    await other.mutation(api.results.record, { mapId, code: ONE_GOLD });
    expect(await miner.query(api.results.myBest, { mapId })).toEqual({ gold: 2, steps: 4 });
    expect(await other.query(api.results.myBest, { mapId })).toEqual({ gold: 1, steps: 2 });
  });

  test("the leaderboard ranks by gold, then fewer steps; equal results share a place, the earlier first", async () => {
    const { t, miner, mapId } = await setup();
    // Hét további játékos; a programjuk határozza meg az eredményt.
    const programs = [ONE_GOLD_SLOW, TWO_GOLD, ONE_GOLD, ONE_GOLD, "print 0", ERRORS_AFTER_GOLD, "print 0\nprint 0"];
    for (const [index, code] of programs.entries()) {
      const player = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", { name: `p${index}` });
        const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 });
        return `${userId}|${sessionId}`;
      });
      await t.withIdentity({ subject: player }).mutation(api.results.record, { mapId, code });
    }
    const board = await miner.query(api.results.leaderboard, { mapId });
    expect(board.map(({ place, name, gold, steps }) => [place, name, gold, steps])).toEqual([
      [1, "p1", 2, 4],
      [2, "p2", 1, 2],
      [2, "p3", 1, 2],
      [4, "p0", 1, 3],
      [4, "p5", 1, 3],
      [6, "p4", 0, 1],
      [7, "p6", 0, 2],
    ]);
    expect(board.every((row) => !row.isMe)).toBe(true);
    // Kisebb limitnél a holtverseny a határon is a korábban elért eredményt tartja meg.
    const top4 = await miner.query(api.results.leaderboard, { mapId, limit: 4 });
    expect(top4.map((row) => row.name)).toEqual(["p1", "p2", "p3", "p0"]);
  });

  test("the caller's own row is marked, and signed-out callers get an empty list", async () => {
    const { t, miner, other, mapId } = await setup();
    expect(await miner.query(api.results.leaderboard, { mapId })).toEqual([]);
    await miner.mutation(api.results.record, { mapId, code: ONE_GOLD });
    await other.mutation(api.results.record, { mapId, code: TWO_GOLD });
    const board = await miner.query(api.results.leaderboard, { mapId });
    expect(board.map((row) => [row.name, row.isMe])).toEqual([
      ["other", false],
      ["miner", true],
    ]);
    expect(await t.query(api.results.leaderboard, { mapId })).toEqual([]);
  });

  test("invalid programs, missing maps and signed-out callers are rejected with codes", async () => {
    const { t, miner, other, mapId } = await setup();
    await expect(miner.mutation(api.results.record, { mapId, code: "Set x to 1" })).rejects.toThrow("RESULT_syntax");
    await expect(miner.mutation(api.results.record, { mapId, code: "print 1\n".repeat(3000) })).rejects.toThrow(
      "RESULT_tooLong",
    );
    await expect(t.mutation(api.results.record, { mapId, code: ONE_GOLD })).rejects.toThrow("RESULT_unauthenticated");
    expect(await t.query(api.results.myBest, { mapId })).toBeNull();
    await other.mutation(api.maps.remove, { mapId });
    await expect(miner.mutation(api.results.record, { mapId, code: ONE_GOLD })).rejects.toThrow("RESULT_notFound");
  });

  test("deleting a map deletes its results too", async () => {
    const { t, miner, other, mapId } = await setup();
    await miner.mutation(api.results.record, { mapId, code: ONE_GOLD });
    await other.mutation(api.maps.remove, { mapId });
    expect(await t.run((ctx) => ctx.db.query("results").take(10))).toEqual([]);
  });
});
