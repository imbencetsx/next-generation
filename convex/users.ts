import { getAuthSessionId, getAuthUserId, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";
import { action, internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { AUTH_PROVIDER, MAX_PASSWORD_LENGTH, normalizeUsername, passwordProblem, usernameProblem } from "./credentials";
import { profileError, validAvatar } from "./profileRules";

/**
 * A bejelentkezett felhasználó azonosítója, vagy null.
 * A JWT a lejártáig érvényes, ezért a munkamenetet is ellenőrizzük: kijelentkezés után azonnal null.
 * Minden védett függvény ezt használja; felhasználó-azonosítót soha ne fogadjunk el argumentumként.
 */
export async function currentUserId(ctx: QueryCtx) {
  const [userId, sessionId] = await Promise.all([getAuthUserId(ctx), getAuthSessionId(ctx)]);
  if (userId === null || sessionId === null) return null;
  const session = await ctx.db.get(sessionId);
  return session?.userId === userId ? userId : null;
}

/** A bejelentkezett felhasználó, vagy null. */
export const viewer = query({
  args: {},
  returns: v.union(v.null(), v.object({ _id: v.id("users"), name: v.string(), imageUrl: v.union(v.string(), v.null()) })),
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return user ? { _id: user._id, name: user.name ?? "player", imageUrl: user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null } : null;
  },
});

export const updateUsername = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) return profileError("unauthenticated");
    const username = normalizeUsername(args.username);
    if (usernameProblem(username)) return profileError("username");
    const account = await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId).eq("provider", AUTH_PROVIDER)).unique();
    if (!account) return profileError("unauthenticated");
    const existing = await ctx.db.query("authAccounts").withIndex("providerAndAccountId", (q) => q.eq("provider", AUTH_PROVIDER).eq("providerAccountId", username)).unique();
    if (existing && existing._id !== account._id) return profileError("taken");
    // A bejelentkezési név és a megjelenített név egyetlen tranzakcióban változik.
    await ctx.db.patch(account._id, { providerAccountId: username });
    await ctx.db.patch(userId, { name: username });
    return null;
  },
});

export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await ctx.runQuery(api.users.viewer, {});
    if (!viewer) return profileError("unauthenticated");
    if (passwordProblem(args.newPassword)) return profileError("password");
    if (!args.currentPassword || args.currentPassword.length > MAX_PASSWORD_LENGTH) return profileError("currentPassword");
    // A meglévő auth-ellenőrzés a hibás jelszópróbálkozásokat is korlátozza.
    const verified = await retrieveAccount(ctx, { provider: AUTH_PROVIDER, account: { id: viewer.name, secret: args.currentPassword } }).catch((error: unknown) => {
      if (error instanceof Error && error.message.includes("TooManyFailedAttempts")) return profileError("locked");
      return profileError("currentPassword");
    });
    if (verified.user._id !== viewer._id || !verified.account.secret) return profileError("conflict");
    const newSecret = await new Scrypt().hash(args.newPassword);
    await ctx.runMutation(internal.users.commitPassword, { accountId: verified.account._id, expectedSecret: verified.account.secret, newSecret });
    return null;
  },
});

export const commitPassword = internalMutation({
  args: { accountId: v.id("authAccounts"), expectedSecret: v.string(), newSecret: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!userId || !sessionId) return profileError("unauthenticated");
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId || account.provider !== AUTH_PROVIDER || account.secret !== args.expectedSecret) return profileError("conflict");
    // A közben megváltozott jelszót nem írjuk felül egy korábbi ellenőrzés alapján.
    await ctx.db.patch(account._id, { secret: args.newSecret });
    await ctx.runMutation(internal.auth.store, { args: { type: "invalidateSessions", userId, except: [sessionId] } });
    return null;
  },
});

export const setPicture = action({
  args: { image: v.bytes() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!await ctx.runQuery(api.users.viewer, {})) return profileError("unauthenticated");
    if (!validAvatar(args.image)) return profileError("image");
    const avatarId = await ctx.storage.store(new Blob([args.image], { type: "image/png" }));
    try {
      await ctx.runMutation(internal.users.commitPicture, { avatarId });
    } catch (error) {
      await ctx.storage.delete(avatarId);
      throw error;
    }
    return null;
  },
});

export const commitPicture = internalMutation({
  args: { avatarId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) return profileError("unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user) return profileError("unauthenticated");
    await ctx.db.patch(userId, { avatarId: args.avatarId });
    if (user.avatarId) await ctx.storage.delete(user.avatarId);
    return null;
  },
});

export const removePicture = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) return profileError("unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user) return profileError("unauthenticated");
    await ctx.db.patch(userId, { avatarId: undefined });
    if (user.avatarId) await ctx.storage.delete(user.avatarId);
    return null;
  },
});
