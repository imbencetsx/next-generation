/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const page = { numItems: 20, cursor: null };

/** A szerző (miner), két másik játékos és egy kijelentkezett hívó. */
async function setup() {
  const t = convexTest(schema, modules);
  const sessions = await t.run(async (ctx) => {
    const expirationTime = Date.now() + 60_000;
    const ids = [];
    for (const name of ["miner", "other", "third"]) {
      const userId = await ctx.db.insert("users", { name });
      const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime });
      ids.push(`${userId}|${sessionId}`);
    }
    return ids;
  });
  const [miner, other, third] = sessions.map((subject) => t.withIdentity({ subject }));
  const mapId = await miner.mutation(api.maps.publish, { name: "corridor", text: "1 2\n>." });
  return { t, miner, other, third, mapId };
}

describe("map likes", () => {
  test("liking toggles, counts each player once, and shows in the list for every viewer", async () => {
    const { miner, other, third, mapId } = await setup();
    expect(await other.mutation(api.likes.toggle, { mapId })).toBe(true);
    expect(await third.mutation(api.likes.toggle, { mapId })).toBe(true);
    // A saját térképet is lehet kedvelni.
    expect(await miner.mutation(api.likes.toggle, { mapId })).toBe(true);

    const [forOther] = (await other.query(api.maps.list, { paginationOpts: page, mine: false })).page;
    expect(forOther).toMatchObject({ likeCount: 3, likedByMe: true });

    expect(await other.mutation(api.likes.toggle, { mapId })).toBe(false);
    expect(await other.query(api.maps.get, { mapId })).toMatchObject({ likeCount: 2, likedByMe: false });
    expect(await third.query(api.maps.get, { mapId })).toMatchObject({ likeCount: 2, likedByMe: true });
  });

  test("a map without likes reports zero and not liked", async () => {
    const { other, mapId } = await setup();
    expect(await other.query(api.maps.get, { mapId })).toMatchObject({ likeCount: 0, likedByMe: false });
  });

  test("only the author sees who liked the map, newest first", async () => {
    const { miner, other, third, mapId } = await setup();
    await other.mutation(api.likes.toggle, { mapId });
    await miner.mutation(api.likes.toggle, { mapId });
    await third.mutation(api.likes.toggle, { mapId });

    const likers = await miner.query(api.likes.likers, { mapId });
    expect(likers?.map(({ name, isMe }) => ({ name, isMe }))).toEqual([
      { name: "third", isMe: false },
      { name: "miner", isMe: true },
      { name: "other", isMe: false },
    ]);
    expect(await other.query(api.likes.likers, { mapId })).toBeNull();
  });

  test("signed-out callers cannot like, and deleting the map removes its likes", async () => {
    const { t, miner, other, mapId } = await setup();
    await expect(t.mutation(api.likes.toggle, { mapId })).rejects.toThrow("MAP_unauthenticated");
    expect(await t.query(api.likes.likers, { mapId })).toBeNull();

    await other.mutation(api.likes.toggle, { mapId });
    await miner.mutation(api.maps.remove, { mapId });
    expect(await t.run((ctx) => ctx.db.query("likes").take(10))).toEqual([]);
    await expect(other.mutation(api.likes.toggle, { mapId })).rejects.toThrow("MAP_notFound");
  });
});
