// Térképek kedvelése: bárki kedvelhet bármelyik közzétett térképet (a sajátját is), egyszer. A kedvelők névsorát
// csak a térkép szerzője látja; a többiek csak a számot. A szám a térkép dokumentumán is ott van (likeCount), hogy
// a lista ne olvassa végig a kedveléseket.

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { mapError } from "./mapRules";
import { currentUserId } from "./users";

/** Ennyi kedvelőt mutatunk a névsorban (a legújabb elöl); a többit csak a szám jelzi. */
export const LIKERS_LIMIT = 100;

async function findLike(ctx: QueryCtx, mapId: Id<"maps">, userId: Id<"users">) {
  return await ctx.db
    .query("likes")
    .withIndex("by_mapId_and_userId", (q) => q.eq("mapId", mapId).eq("userId", userId))
    .unique();
}

export async function hasLiked(ctx: QueryCtx, mapId: Id<"maps">, userId: Id<"users">) {
  return (await findLike(ctx, mapId, userId)) !== null;
}

/** A térkép törlésekor a kedvelései is mennek. */
export async function deleteLikes(ctx: MutationCtx, mapId: Id<"maps">) {
  for await (const like of ctx.db.query("likes").withIndex("by_mapId", (q) => q.eq("mapId", mapId))) {
    await ctx.db.delete(like._id);
  }
}

/** Kedvelés be/ki. Az új állapotot adja vissza (true: most kedveli). */
export const toggle = mutation({
  args: { mapId: v.id("maps") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw mapError("unauthenticated");
    const map = await ctx.db.get(args.mapId);
    if (!map) throw mapError("notFound");

    const existing = await findLike(ctx, args.mapId, userId);
    const count = map.likeCount ?? 0;
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.mapId, { likeCount: Math.max(0, count - 1) });
      return false;
    }
    await ctx.db.insert("likes", { mapId: args.mapId, userId });
    await ctx.db.patch(args.mapId, { likeCount: count + 1 });
    return true;
  },
});

/** Kik kedvelték a térképet, a legújabb elöl. Csak a szerzőnek; másnak (és nem létező térképnél) null. */
export const likers = query({
  args: { mapId: v.id("maps") },
  returns: v.union(
    v.array(
      v.object({
        name: v.string(),
        imageUrl: v.union(v.string(), v.null()),
        likedAt: v.number(),
        isMe: v.boolean(),
      }),
    ),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const viewerId = await currentUserId(ctx);
    const map = await ctx.db.get(args.mapId);
    if (!viewerId || !map || map.ownerId !== viewerId) return null;

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_mapId", (q) => q.eq("mapId", args.mapId))
      .order("desc")
      .take(LIKERS_LIMIT);
    const users = await Promise.all(likes.map((like) => ctx.db.get(like.userId)));
    // A profilkép aláírt címe (vagy null, ha a játékosnak nincs képe); a lista legfeljebb LIKERS_LIMIT elemű.
    const imageUrls = await Promise.all(
      users.map((user) => (user?.avatarId ? ctx.storage.getUrl(user.avatarId) : null)),
    );
    return likes.map((like, index) => ({
      name: users[index]?.name ?? "player",
      imageUrl: imageUrls[index],
      likedAt: like._creationTime,
      isMe: like.userId === viewerId,
    }));
  },
});
