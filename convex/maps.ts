// Közzétett térképek: közzététel, listázás és a saját térkép törlése.
// Minden bejelentkezett felhasználó látja a közzétett térképeket (a kiírás ezt a csapatra bízza, 3.2).
// A térképet a szerver is ugyanazzal a térképolvasóval ellenőrzi, mint a játék, és normalizált szövegként tárolja.

import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { formatMap } from "../lib/map-editor";
import { parseMap } from "../lib/robot-map";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { mapError, publishedMapName } from "./mapRules";
import { currentUserId } from "./users";

/** Egy térkép a listában: a tárolt adatok, a szerző neve, és hogy a hívóé-e. */
const publishedMap = v.object({
  _id: v.id("maps"),
  _creationTime: v.number(),
  name: v.string(),
  text: v.string(),
  rows: v.number(),
  cols: v.number(),
  goldCount: v.number(),
  authorName: v.string(),
  isMine: v.boolean(),
});

/** A listaelem: a térkép, a szerző neve, és hogy a hívóé-e. A ranglistát külön lekérdezés adja (results.ts). */
async function forViewer(ctx: QueryCtx, map: Doc<"maps">, viewerId: Doc<"users">["_id"]) {
  const author = await ctx.db.get(map.ownerId);
  const { ownerId, ...fields } = map;
  return { ...fields, authorName: author?.name ?? "player", isMine: ownerId === viewerId };
}

export const publish = mutation({
  args: { name: v.string(), text: v.string() },
  returns: v.id("maps"),
  handler: async (ctx, args) => {
    const ownerId = await currentUserId(ctx);
    if (!ownerId) throw mapError("unauthenticated");
    const name = publishedMapName(args.name);
    if (!name) throw mapError("name");
    const parsed = parseMap(args.text);
    if (!parsed.ok) throw mapError("invalid");

    const { map } = parsed;
    return await ctx.db.insert("maps", {
      ownerId,
      name,
      text: formatMap(map),
      rows: map.rows,
      cols: map.cols,
      goldCount: map.gold.filter(Boolean).length,
    });
  },
});

/** A közzétett térképek, a legújabb elöl; `mine` esetén csak a hívó sajátjai. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator, mine: v.boolean() },
  returns: paginationResultValidator(publishedMap),
  handler: async (ctx, args) => {
    const viewerId = await currentUserId(ctx);
    if (!viewerId) return { page: [], isDone: true, continueCursor: "" };

    const maps = args.mine
      ? ctx.db.query("maps").withIndex("by_ownerId", (q) => q.eq("ownerId", viewerId))
      : ctx.db.query("maps");
    const result = await maps.order("desc").paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map((map) => forViewer(ctx, map, viewerId)));
    return { ...result, page };
  },
});

/**
 * Egy közzétett térkép a ranglista-oldalhoz. Az azonosító az URL-ből jön, ezért szövegként fogadjuk:
 * érvénytelen vagy már nem létező térképnél null.
 */
export const get = query({
  args: { mapId: v.string() },
  returns: v.union(publishedMap, v.null()),
  handler: async (ctx, args) => {
    const viewerId = await currentUserId(ctx);
    const mapId = ctx.db.normalizeId("maps", args.mapId);
    if (!viewerId || !mapId) return null;
    const map = await ctx.db.get(mapId);
    return map && (await forViewer(ctx, map, viewerId));
  },
});

/** Saját térkép törlése a hozzá tartozó eredményekkel együtt; más térképét nem lehet. */
export const remove = mutation({
  args: { mapId: v.id("maps") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw mapError("unauthenticated");
    const map = await ctx.db.get(args.mapId);
    if (!map) throw mapError("notFound");
    if (map.ownerId !== userId) throw mapError("forbidden");
    // Az eredmények térképenként legfeljebb játékosonként egy sor, így egy tranzakcióba beleférnek.
    for await (const result of ctx.db
      .query("results")
      .withIndex("by_mapId_and_rank", (q) => q.eq("mapId", args.mapId))) {
      await ctx.db.delete(result._id);
    }
    await ctx.db.delete(args.mapId);
    return null;
  },
});
