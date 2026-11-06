import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";

/**
 * A bejelentkezett felhasználó azonosítója, vagy null.
 * A JWT a lejártáig érvényes, ezért a munkamenetet is ellenőrizzük: kijelentkezés után azonnal null.
 * Minden védett függvény ezt használja; felhasználó-azonosítót soha ne fogadjunk el argumentumként.
 */
export async function currentUserId(ctx: QueryCtx) {
  const [userId, sessionId] = await Promise.all([getAuthUserId(ctx), getAuthSessionId(ctx)]);
  if (userId === null || sessionId === null) return null;
  return (await ctx.db.get(sessionId)) ? userId : null;
}

/** A bejelentkezett felhasználó, vagy null. */
export const viewer = query({
  args: {},
  returns: v.union(v.null(), v.object({ _id: v.id("users"), name: v.string() })),
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return user ? { _id: user._id, name: user.name ?? "player" } : null;
  },
});
