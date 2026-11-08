// A bejelentkezett felhasználó adatai és a profil módosítása (név, jelszó, profilkép).
// Minden függvény a munkamenetből azonosítja a hívót; felhasználó-azonosítót argumentumként nem fogadunk el.

import { getAuthSessionId, getAuthUserId, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  AUTH_PROVIDER,
  MAX_PASSWORD_LENGTH,
  isLockedOut,
  normalizeUsername,
  isValidPassword,
  isValidUsername,
} from "./credentials";
import { profileError, validAvatar } from "./profileRules";
import { DEFAULT_ROBOT } from "../lib/robots";
import { robotValidator } from "./robotRules";

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

/** A bejelentkezett felhasználó rekordja, vagy null. */
async function currentUser(ctx: QueryCtx) {
  const userId = await currentUserId(ctx);
  return userId === null ? null : await ctx.db.get(userId);
}

/** A hívó felhasználói rekordja; ha nincs bejelentkezve, „unauthenticated” hibát dob. */
async function requireUser(ctx: QueryCtx) {
  const user = await currentUser(ctx);
  if (!user) throw profileError("unauthenticated");
  return user;
}

/** A felhasználó jelszavas fiókja (a bejelentkezési név és a jelszó-hash itt van, nem a users táblában). */
function passwordAccount(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId).eq("provider", AUTH_PROVIDER))
    .unique();
}

function accountByUsername(ctx: QueryCtx, username: string) {
  return ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) => q.eq("provider", AUTH_PROVIDER).eq("providerAccountId", username))
    .unique();
}

/** Foglalt-e már a név (regisztráció előtt, convex/auth.ts). */
export const isUsernameTaken = internalQuery({
  args: { username: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => (await accountByUsername(ctx, args.username)) !== null,
});

/** A bejelentkezett felhasználó, vagy null. */
const localeValidator = v.union(v.literal("en"), v.literal("hu"));

export const viewer = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.string(),
      imageUrl: v.union(v.string(), v.null()),
      /** A fiókhoz mentett nyelv; null, ha még nem állította be (ilyenkor a süti vagy a böngésző dönt). */
      locale: v.union(localeValidator, v.null()),
      robot: robotValidator,
      robotSetupPending: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const imageUrl = user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null;
    return {
      _id: user._id,
      name: user.name ?? "player",
      imageUrl,
      locale: user.locale ?? null,
      robot: user.robot ?? DEFAULT_ROBOT,
      robotSetupPending: user.robotSetupPending ?? false,
    };
  },
});

/** A saját robot mentése egyben lezárja a regisztráció utáni választást is. */
export const setRobot = mutation({
  args: { robot: robotValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { robot: args.robot, robotSetupPending: false });
    return null;
  },
});

/** A felület nyelvének mentése a fiókhoz, hogy minden eszközön ez legyen. */
export const setLocale = mutation({
  args: { locale: localeValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { locale: args.locale });
    return null;
  },
});

export const updateUsername = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const username = normalizeUsername(args.username);
    if (!isValidUsername(username)) throw profileError("username");

    const account = await passwordAccount(ctx, user._id);
    if (!account) throw profileError("unauthenticated");
    const existing = await accountByUsername(ctx, username);
    if (existing && existing._id !== account._id) throw profileError("taken");

    // A bejelentkezési név és a megjelenített név egyetlen tranzakcióban változik.
    await ctx.db.patch(account._id, { providerAccountId: username });
    await ctx.db.patch(user._id, { name: username });
    return null;
  },
});

/**
 * Jelszócsere. Több lépésből áll, mert a scrypt lassú (ezért actionben fut, nem mutationben), és a jelenlegi jelszót a
 * Convex Auth saját ellenőrzésével kell megnézni (az számolja a hibás próbálkozásokat):
 *   1. changePassword (action): bejelentkezés és az új jelszó szabályának ellenőrzése;
 *   2. a jelenlegi jelszó ellenőrzése a retrieveAccount-tal; sok hibás próbánál „locked”;
 *   3. az új jelszó hash-elése;
 *   4. commitPassword (internalMutation): egy tranzakcióban beírja az új hash-t, ha közben nem változott,
 *      és kilépteti a felhasználó többi munkamenetét.
 */
export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await ctx.runQuery(api.users.viewer, {});
    if (!viewer) throw profileError("unauthenticated");
    if (!isValidPassword(args.newPassword)) throw profileError("password");
    if (!args.currentPassword || args.currentPassword.length > MAX_PASSWORD_LENGTH) {
      throw profileError("currentPassword");
    }

    // A Convex Auth ellenőrzése a hibás próbálkozásokat is számolja és korlátozza.
    const credentials = { id: viewer.name, secret: args.currentPassword };
    const verified = await retrieveAccount(ctx, { provider: AUTH_PROVIDER, account: credentials }).catch(
      (error: unknown) => {
        throw profileError(isLockedOut(error) ? "locked" : "currentPassword");
      },
    );
    if (verified.user._id !== viewer._id || !verified.account.secret) throw profileError("conflict");

    // Ugyanazt a scrypt hash-formátumot használjuk, mint a Convex Auth (convex/auth.ts), ezért a lucia csomagból.
    const newSecret = await new Scrypt().hash(args.newPassword);
    await ctx.runMutation(internal.users.commitPassword, {
      accountId: verified.account._id,
      expectedSecret: verified.account.secret,
      newSecret,
    });
    return null;
  },
});

export const commitPassword = internalMutation({
  args: { accountId: v.id("authAccounts"), expectedSecret: v.string(), newSecret: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!userId || !sessionId) throw profileError("unauthenticated");

    const account = await ctx.db.get(args.accountId);
    const stillTheSameAccount =
      account &&
      account.userId === userId &&
      account.provider === AUTH_PROVIDER &&
      // A közben megváltozott jelszót nem írjuk felül egy korábbi ellenőrzés alapján.
      account.secret === args.expectedSecret;
    if (!stillTheSameAccount) throw profileError("conflict");

    await ctx.db.patch(account._id, { secret: args.newSecret });
    // A többi eszközön lévő munkamenet kilép; a jelenlegi megmarad.
    await ctx.runMutation(internal.auth.store, { args: { type: "invalidateSessions", userId, except: [sessionId] } });
    return null;
  },
});

/** Profilkép mentése. A tárolás action, mert a fájltárba írni csak actionből lehet. */
export const setPicture = action({
  args: { image: v.bytes() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await ctx.runQuery(api.users.viewer, {}))) throw profileError("unauthenticated");
    if (!validAvatar(args.image)) throw profileError("image");

    const avatarId = await ctx.storage.store(new Blob([args.image], { type: "image/png" }));
    try {
      await ctx.runMutation(internal.users.commitPicture, { avatarId });
    } catch (error) {
      // Ha a hozzárendelés nem sikerült, ne maradjon gazdátlan fájl a tárban.
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
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { avatarId: args.avatarId });
    if (user.avatarId) await ctx.storage.delete(user.avatarId);
    return null;
  },
});

export const removePicture = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { avatarId: undefined });
    if (user.avatarId) await ctx.storage.delete(user.avatarId);
    return null;
  },
});
