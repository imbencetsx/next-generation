// Futási eredmények a közzétett térképeken (kiírás 3.5). Játékosonként és térképenként a legjobb eredményt
// tároljuk; ebből készül a ranglista. Az eredményt a szerver számolja: a kliens csak a programot küldi, a
// szerver ugyanazzal a motorral lefuttatja a tárolt térképen, így a pontszám nem hamisítható.

import { v } from "convex/values";
import { parseMap } from "../lib/robot-map";
import { isBetterScore, scoreProgram, scoreRank } from "../lib/scoring";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { LEADERBOARD_SIZE, MAX_RECORDED_CODE_LENGTH, resultError } from "./resultRules";
import { currentUserId } from "./users";

const score = v.object({ gold: v.number(), steps: v.number() });

/** Holtversenynél legfeljebb ennyi sort olvasunk végig (biztosíték sok azonos eredmény ellen). */
const MAX_TIE_SCAN = 100;

/** A játékos eddigi legjobb eredménye egy térképen, vagy null. */
export function bestResult(ctx: QueryCtx, mapId: Id<"maps">, userId: Id<"users">) {
  return ctx.db
    .query("results")
    .withIndex("by_mapId_and_userId", (q) => q.eq("mapId", mapId).eq("userId", userId))
    .unique();
}

/**
 * Egy befejezett futás rögzítése. Visszaadja a szerver által számolt eredményt, az ezután érvényes legjobbat,
 * és hogy ez a futás javított-e rajta.
 */
export const record = mutation({
  args: { mapId: v.id("maps"), code: v.string() },
  returns: v.object({
    run: v.object({ gold: v.number(), steps: v.number(), errorCode: v.union(v.string(), v.null()) }),
    best: score,
    improved: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw resultError("unauthenticated");
    if (args.code.length > MAX_RECORDED_CODE_LENGTH) throw resultError("tooLong");
    const map = await ctx.db.get(args.mapId);
    if (!map) throw resultError("notFound");
    const parsedMap = parseMap(map.text);
    // A tárolt térképet közzétételkor ellenőriztük; ha mégsem olvasható, a térkép számít nem létezőnek.
    if (!parsedMap.ok) throw resultError("notFound");

    const scored = scoreProgram(args.code, parsedMap.map);
    if (!scored.ok) throw resultError("syntax");
    const { run } = scored;

    const previous = await bestResult(ctx, args.mapId, userId);
    const improved = !previous || isBetterScore(run, previous);
    if (improved) {
      const fields = {
        gold: run.gold,
        steps: run.steps,
        rank: scoreRank(run),
        errorCode: run.errorCode,
        code: args.code,
      };
      // Csere, nem módosítás: így a sor létrehozási ideje az, amikor ezt a legjobb eredményt elérte, és a
      // ranglistán holtversenyben a korábban elért eredmény áll elöl.
      if (previous) await ctx.db.delete(previous._id);
      await ctx.db.insert("results", { mapId: args.mapId, userId, ...fields });
    }
    const best = improved ? run : previous!;
    return { run, best: { gold: best.gold, steps: best.steps }, improved };
  },
});

/** A bejelentkezett játékos legjobb eredménye egy térképen, vagy null. */
export const myBest = query({
  args: { mapId: v.id("maps") },
  returns: v.union(score, v.null()),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) return null;
    const best = await bestResult(ctx, args.mapId, userId);
    return best && { gold: best.gold, steps: best.steps };
  },
});

/**
 * Egy térkép ranglistájának eleje (kiírás 3.5): a legjobb LEADERBOARD_SIZE játékos, előbb több arany, azon belül
 * kevesebb lépés. Pontosan egyforma eredmény ugyanazt a helyezést kapja (pl. 1., 2., 2., 4.).
 */
export const leaderboard = query({
  args: { mapId: v.id("maps") },
  returns: v.array(
    v.object({ place: v.number(), name: v.string(), gold: v.number(), steps: v.number(), isMe: v.boolean() }),
  ),
  handler: async (ctx, args) => {
    const viewerId = await currentUserId(ctx);
    if (!viewerId) return [];
    // Csökkenő rangsorban olvasunk; az 5. hely holtversenyét is végigolvassuk, hogy közülük a korábban elért
    // eredmény kerüljön előre (az index azonos rangnál a későbbit adná előbb).
    const candidates: Doc<"results">[] = [];
    const byRank = ctx.db
      .query("results")
      .withIndex("by_mapId_and_rank", (q) => q.eq("mapId", args.mapId))
      .order("desc");
    for await (const result of byRank) {
      const last = candidates.at(-1);
      if (candidates.length >= LEADERBOARD_SIZE && result.rank !== last?.rank) break;
      candidates.push(result);
      if (candidates.length >= MAX_TIE_SCAN) break;
    }
    candidates.sort((a, b) => b.rank - a.rank || a._creationTime - b._creationTime);
    const top = candidates.slice(0, LEADERBOARD_SIZE);
    const players = await Promise.all(top.map((result) => ctx.db.get(result.userId)));

    return top.map((result, index) => {
      // Holtversenyben az első azonos rangú sor helyezését kapja.
      const firstEqual = top.findIndex((other) => other.rank === result.rank);
      return {
        place: firstEqual + 1,
        name: players[index]?.name ?? "player",
        gold: result.gold,
        steps: result.steps,
        isMe: result.userId === viewerId,
      };
    });
  },
});
