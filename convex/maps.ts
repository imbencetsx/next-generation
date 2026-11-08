// Közzétett térképek: közzététel, listázás és a saját térkép törlése.
// Minden bejelentkezett felhasználó látja a közzétett térképeket (a kiírás ezt a csapatra bízza, 3.2).
// A térképet a szerver is ugyanazzal a térképolvasóval ellenőrzi, mint a játék, és normalizált szövegként tárolja.

import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { formatMap } from "../lib/map-editor";
import { parseMap } from "../lib/robot-map";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query, env, type QueryCtx } from "./_generated/server";
import { mapError, publishedMapName } from "./mapRules";
import { deleteLikes, hasLiked } from "./likes";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components, internal } from "./_generated/api";
import { checkMapNameWithAI, hasBlockedMapName } from "./mapModeration";
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
  likeCount: v.number(),
  likedByMe: v.boolean(),
});

/**
 * A listaelem: a térkép, a szerző neve, hogy a hívóé-e, és a kedvelések (hányan, és a hívó is kedveli-e).
 * A ranglistát külön lekérdezés adja (results.ts), a kedvelők névsorát a likes.ts.
 */
async function forViewer(ctx: QueryCtx, map: Doc<"maps">, viewerId: Doc<"users">["_id"]) {
  const author = await ctx.db.get(map.ownerId);
  const { ownerId, likeCount, ...fields } = map;
  return {
    ...fields,
    authorName: author?.name ?? "player",
    isMine: ownerId === viewerId,
    likeCount: likeCount ?? 0,
    likedByMe: await hasLiked(ctx, map._id, viewerId),
  };
}

const MAX_PUBLISH_NAME_INPUT_LENGTH = 256;
const MAX_PUBLISH_SOURCE_LENGTH = 16 * 1024;
const publishArgs = { name: v.string(), text: v.string() };
const publishingLimits = new RateLimiter(components.rateLimiter, {
  publishMap: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 3 },
});

/** Az elutasított próbálkozások is fogyasztanak keretet; az action hibája ezt nem görgeti vissza. */
export const reservePublishAttempt = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId || !(await ctx.db.get(userId))) throw mapError("unauthenticated");
    return (await publishingLimits.limit(ctx, "publishMap", { key: userId })).ok;
  },
});

function validatedPublication(args: { name: string; text: string }) {
  if (args.name.length > MAX_PUBLISH_NAME_INPUT_LENGTH) throw mapError("name");
  if (args.text.length > MAX_PUBLISH_SOURCE_LENGTH) throw mapError("invalid");
  const name = publishedMapName(args.name);
  if (!name) throw mapError("name");
  const parsed = parseMap(args.text);
  if (!parsed.ok) throw mapError("invalid");
  if (hasBlockedMapName(name)) throw mapError("moderated");
  return { name, map: parsed.map };
}

export const publish = action({
  args: publishArgs,
  returns: v.id("maps"),
  handler: async (ctx, args): Promise<Id<"maps">> => {
    const allowed = await ctx.runMutation(internal.maps.reservePublishAttempt, {});
    if (!allowed) throw mapError("rateLimited");
    const { name, map } = validatedPublication(args);
    const text = formatMap(map);
    await checkMapNameWithAI(name, env.OPENAI_API_KEY);
    return await ctx.runMutation(internal.maps.commitPublication, { name, text });
  },
});

/** Kizárólag a moderáló action hívhatja; a mentéskor a munkamenetet is újra ellenőrizzük. */
export const commitPublication = internalMutation({
  args: publishArgs,
  returns: v.id("maps"),
  handler: async (ctx, args) => {
    const ownerId = await currentUserId(ctx);
    if (!ownerId || !(await ctx.db.get(ownerId))) throw mapError("unauthenticated");
    const { name, map } = validatedPublication(args);
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

/** Saját térkép törlése a hozzá tartozó eredményekkel és kedvelésekkel együtt; más térképét nem lehet. */
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
    await deleteLikes(ctx, args.mapId);
    await ctx.db.delete(args.mapId);
    return null;
  },
});
