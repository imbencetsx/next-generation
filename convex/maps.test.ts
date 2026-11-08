/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import rateLimiter from "@convex-dev/rate-limiter/test";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";
const page = { numItems: 20, cursor: null };

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-moderation-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const { input } = JSON.parse(init.body as string) as { input: string[] };
      return new Response(JSON.stringify({ results: input.map(() => ({ flagged: false })) }));
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/** Két bejelentkezett felhasználó (érvényes munkamenettel) és egy kijelentkezett hívó. */
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const ids = await t.run(async (ctx) => {
    const minerId = await ctx.db.insert("users", { name: "miner" });
    const otherId = await ctx.db.insert("users", { name: "other" });
    const minerSession = await ctx.db.insert("authSessions", { userId: minerId, expirationTime: Date.now() + 60_000 });
    const otherSession = await ctx.db.insert("authSessions", { userId: otherId, expirationTime: Date.now() + 60_000 });
    return { minerId, otherId, minerSession, otherSession };
  });
  const miner = t.withIdentity({ subject: `${ids.minerId}|${ids.minerSession}` });
  const other = t.withIdentity({ subject: `${ids.otherId}|${ids.otherSession}` });
  return { t, miner, other, ...ids };
}

describe("published maps", () => {
  test("a valid map is stored normalized, with its size and gold count, and listed with its author", async () => {
    const { miner, other } = await setup();
    await miner.action(api.maps.publish, { name: "  corridor.map ", text: `${CORRIDOR.replaceAll("\n", "\r\n")}\n` });
    const [map] = (await other.query(api.maps.list, { paginationOpts: page, mine: false })).page;
    expect(map).toMatchObject({ name: "corridor", text: CORRIDOR, rows: 3, cols: 10, goldCount: 3 });
    expect(map.authorName).toBe("miner");
    expect(map.isMine).toBe(false);
  });

  test("the list is newest first, and mine filters to the caller's own maps", async () => {
    const { miner, other } = await setup();
    await miner.action(api.maps.publish, { name: "first", text: "1 1\n>" });
    await other.action(api.maps.publish, { name: "second", text: "1 1\n<" });
    await miner.action(api.maps.publish, { name: "third", text: "1 1\n^" });
    const all = (await miner.query(api.maps.list, { paginationOpts: page, mine: false })).page;
    expect(all.map((map) => map.name)).toEqual(["third", "second", "first"]);
    expect(all.map((map) => map.isMine)).toEqual([true, false, true]);
    const mine = (await miner.query(api.maps.list, { paginationOpts: page, mine: true })).page;
    expect(mine.map((map) => map.name)).toEqual(["third", "first"]);
  });

  test("invalid maps, names and signed-out callers are rejected with codes", async () => {
    const { t, miner } = await setup();
    await expect(miner.action(api.maps.publish, { name: "gold", text: "1 1\n@" })).rejects.toThrow("MAP_invalid");
    await expect(miner.action(api.maps.publish, { name: " .map ", text: "1 1\n>" })).rejects.toThrow("MAP_name");
    await expect(miner.action(api.maps.publish, { name: "x".repeat(61), text: "1 1\n>" })).rejects.toThrow("MAP_name");
    await expect(t.action(api.maps.publish, { name: "anon", text: "1 1\n>" })).rejects.toThrow("MAP_unauthenticated");
    expect((await t.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
  });

  test("only the owner can delete a map", async () => {
    const { miner, other } = await setup();
    const mapId = await miner.action(api.maps.publish, { name: "mine", text: "1 1\n>" });
    await expect(other.mutation(api.maps.remove, { mapId })).rejects.toThrow("MAP_forbidden");
    await miner.mutation(api.maps.remove, { mapId });
    expect((await other.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
    await expect(miner.mutation(api.maps.remove, { mapId })).rejects.toThrow("MAP_notFound");
  });

  test("one map can be fetched by its id from the URL; a bad or deleted id gives null", async () => {
    const { t, miner, other } = await setup();
    const mapId = await miner.action(api.maps.publish, { name: "single", text: "1 1\n>" });
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

describe("map name moderation", () => {
  test.each(["mine", "Ősi bánya"])("only title forms are sent for moderation of %s", async (name) => {
    const { miner } = await setup();
    const id = await miner.action(api.maps.publish, { name, text: CORRIDOR });
    expect(fetch).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe("omni-moderation-latest");
    expect(body.input).toEqual(name === "mine" ? ["mine"] : ["Ősi bánya", "osi banya"]);
    expect(await miner.query(api.maps.get, { mapId: id })).toMatchObject({ text: CORRIDOR });
  });

  test("local rejections do not call AI or create any public map", async () => {
    const { miner } = await setup();
    await expect(miner.action(api.maps.publish, { name: "f.u.c.k", text: "1 1\n>" })).rejects.toThrow("MAP_moderated");
    expect(fetch).not.toHaveBeenCalled();
    expect((await miner.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
  });

  test("an AI rejection keeps the map private", async () => {
    const { miner } = await setup();
    vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
      const { input } = JSON.parse(init?.body as string) as { input: string[] };
      return new Response(JSON.stringify({ results: input.map(() => ({ flagged: true })) }));
    });
    await expect(miner.action(api.maps.publish, { name: "Threatening name", text: "1 1\n>" })).rejects.toThrow(
      "MAP_moderated",
    );
    expect((await miner.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
  });

  test("AI outages, malformed results and a missing key never publish unchecked maps", async () => {
    for (const response of [
      new Response("down", { status: 503 }),
      new Response("not JSON"),
      new Response('{"results":[]}'),
      new Response('{"results":[{"flagged":"false"}]}'),
    ]) {
      const { miner } = await setup();
      vi.mocked(fetch).mockResolvedValueOnce(response);
      await expect(miner.action(api.maps.publish, { name: "Gold mine", text: "1 1\n>" })).rejects.toThrow(
        "MAP_moderationUnavailable",
      );
      expect((await miner.query(api.maps.list, { paginationOpts: page, mine: false })).page).toEqual([]);
    }
    const { miner } = await setup();
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(miner.action(api.maps.publish, { name: "Gold mine", text: "1 1\n>" })).rejects.toThrow(
      "MAP_moderationUnavailable",
    );
  });

  test("a revoked session during moderation cannot commit the approved map", async () => {
    const { t, miner, minerSession } = await setup();
    vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
      await t.run((ctx) => ctx.db.delete(minerSession));
      const { input } = JSON.parse(init?.body as string) as { input: string[] };
      return new Response(JSON.stringify({ results: input.map(() => ({ flagged: false })) }));
    });
    await expect(miner.action(api.maps.publish, { name: "Gold mine", text: "1 1\n>" })).rejects.toThrow(
      "MAP_unauthenticated",
    );
    expect(await t.run((ctx) => ctx.db.query("maps").take(1))).toEqual([]);
  });

  test("rejected attempts are rate limited per account, including concurrent requests", async () => {
    const { miner, other } = await setup();
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, () => miner.action(api.maps.publish, { name: "fuck", text: "1 1\n>" })),
    );
    expect(
      attempts.filter((result) => result.status === "rejected" && String(result.reason).includes("MAP_moderated")),
    ).toHaveLength(3);
    expect(
      attempts.filter((result) => result.status === "rejected" && String(result.reason).includes("MAP_rateLimited")),
    ).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
    await expect(other.action(api.maps.publish, { name: "Another mine", text: "1 1\n>" })).resolves.toBeTruthy();
  });
});
