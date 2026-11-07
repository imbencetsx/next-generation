/// <reference types="vite/client" />
import { beforeAll, describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { Scrypt } from "lucia";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { MAX_AVATAR_DIMENSION, MAX_AVATAR_BYTES, validAvatar } from "./profileRules";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const oldPassword = "original-test-password";
const newPassword = "replacement-test-password";
let oldSecret: string;
beforeAll(async () => {
  oldSecret = await new Scrypt().hash(oldPassword);
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "miner" });
    const otherId = await ctx.db.insert("users", { name: "other" });
    const accountId = await ctx.db.insert("authAccounts", {
      userId,
      provider: "username",
      providerAccountId: "miner",
      secret: oldSecret,
    });
    const otherAccountId = await ctx.db.insert("authAccounts", {
      userId: otherId,
      provider: "username",
      providerAccountId: "other",
      secret: oldSecret,
    });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 });
    const secondSessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 });
    const otherSessionId = await ctx.db.insert("authSessions", {
      userId: otherId,
      expirationTime: Date.now() + 60_000,
    });
    const refreshId = await ctx.db.insert("authRefreshTokens", {
      sessionId: secondSessionId,
      expirationTime: Date.now() + 60_000,
    });
    return { userId, otherId, accountId, otherAccountId, sessionId, secondSessionId, otherSessionId, refreshId };
  });
  const user = t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` });
  const other = t.withIdentity({ subject: `${ids.otherId}|${ids.otherSessionId}` });
  return { t, user, other, ...ids };
}

function png() {
  const decoded = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0)).buffer;
}

describe("profile authorization and credentials", () => {
  test("signed-out callers cannot read or change a profile", async () => {
    const { t } = await setup();
    expect(await t.query(api.users.viewer, {})).toBeNull();
    await expect(t.mutation(api.users.updateUsername, { username: "stolen" })).rejects.toThrow(
      "PROFILE_unauthenticated",
    );
    await expect(t.action(api.users.changePassword, { currentPassword: oldPassword, newPassword })).rejects.toThrow(
      "PROFILE_unauthenticated",
    );
    await expect(t.action(api.users.setPicture, { image: png() })).rejects.toThrow("PROFILE_unauthenticated");
    await expect(t.mutation(api.users.removePicture, {})).rejects.toThrow("PROFILE_unauthenticated");
  });

  test("a deleted session or another user's session cannot authorize a change", async () => {
    const { t, user, userId, sessionId, otherSessionId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.delete(sessionId);
    });
    await expect(user.mutation(api.users.updateUsername, { username: "changed" })).rejects.toThrow(
      "PROFILE_unauthenticated",
    );
    const forged = t.withIdentity({ subject: `${userId}|${otherSessionId}` });
    expect(await forged.query(api.users.viewer, {})).toBeNull();
  });

  test("renaming updates login and display name together, preserving the password", async () => {
    const { t, user, userId, accountId } = await setup();
    await user.mutation(api.users.updateUsername, { username: "  NewMiner  " });
    expect((await user.query(api.users.viewer, {}))?.name).toBe("newminer");
    const account = await t.run((ctx) => ctx.db.get(accountId));
    expect(account?.providerAccountId).toBe("newminer");
    expect(account?.secret).toBe(oldSecret);
    const result = await t.mutation(internal.auth.store, {
      args: {
        type: "retrieveAccountWithCredentials",
        provider: "username",
        account: { id: "newminer", secret: oldPassword },
      },
    });
    expect(result).toMatchObject({ user: { _id: userId } });
    expect(
      await t.mutation(internal.auth.store, {
        args: {
          type: "retrieveAccountWithCredentials",
          provider: "username",
          account: { id: "miner", secret: oldPassword },
        },
      }),
    ).toBe("InvalidAccountId");
  });

  test("duplicate and invalid names leave both accounts unchanged", async () => {
    const { t, user, accountId, otherAccountId } = await setup();
    await expect(user.mutation(api.users.updateUsername, { username: "OTHER" })).rejects.toThrow("PROFILE_taken");
    for (const username of ["a", "not valid", "x".repeat(21)]) {
      await expect(user.mutation(api.users.updateUsername, { username })).rejects.toThrow("PROFILE_username");
    }
    expect((await t.run((ctx) => ctx.db.get(accountId)))?.providerAccountId).toBe("miner");
    expect((await t.run((ctx) => ctx.db.get(otherAccountId)))?.providerAccountId).toBe("other");
    await user.mutation(api.users.updateUsername, { username: "MINER" });
  });

  test("wrong current password and invalid new password leave credentials and sessions intact", async () => {
    const { t, user, accountId, secondSessionId } = await setup();
    await expect(
      user.action(api.users.changePassword, { currentPassword: "wrong-password", newPassword }),
    ).rejects.toThrow("PROFILE_currentPassword");
    await expect(
      user.action(api.users.changePassword, { currentPassword: oldPassword, newPassword: "short" }),
    ).rejects.toThrow("PROFILE_password");
    expect((await t.run((ctx) => ctx.db.get(accountId)))?.secret).toBe(oldSecret);
    expect(await t.run((ctx) => ctx.db.get(secondSessionId))).not.toBeNull();
  });

  test("password change accepts the new password, rejects the old and revokes only other own sessions", async () => {
    const { t, user, other, accountId, secondSessionId, refreshId } = await setup();
    await user.action(api.users.changePassword, { currentPassword: oldPassword, newPassword });
    const account = await t.run((ctx) => ctx.db.get(accountId));
    expect(await new Scrypt().verify(account!.secret!, newPassword)).toBe(true);
    expect(await new Scrypt().verify(account!.secret!, oldPassword)).toBe(false);
    expect(await user.query(api.users.viewer, {})).not.toBeNull();
    expect(await other.query(api.users.viewer, {})).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.get(secondSessionId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(refreshId))).toBeNull();
  });

  test("stale verification and a different user's account cannot overwrite a password", async () => {
    const { t, user, accountId, otherAccountId } = await setup();
    await expect(
      user.mutation(internal.users.commitPassword, {
        accountId,
        expectedSecret: "stale-hash",
        newSecret: "replacement",
      }),
    ).rejects.toThrow("PROFILE_conflict");
    await expect(
      user.mutation(internal.users.commitPassword, {
        accountId: otherAccountId,
        expectedSecret: oldSecret,
        newSecret: "replacement",
      }),
    ).rejects.toThrow("PROFILE_conflict");
    expect((await t.run((ctx) => ctx.db.get(otherAccountId)))?.secret).toBe(oldSecret);
  });

  test("current-password attempts use the existing auth rate limit", async () => {
    const { user } = await setup();
    for (let i = 0; i < 10; i++) {
      await expect(
        user.action(api.users.changePassword, { currentPassword: "wrong-password", newPassword }),
      ).rejects.toThrow("PROFILE_currentPassword");
    }
    await expect(user.action(api.users.changePassword, { currentPassword: oldPassword, newPassword })).rejects.toThrow(
      "PROFILE_locked",
    );
  });
});

describe("profile picture storage", () => {
  test("stores, replaces and removes only the current user's picture", async () => {
    const { t, user, other, userId, otherId } = await setup();
    await user.action(api.users.setPicture, { image: png() });
    const first = (await t.run((ctx) => ctx.db.get(userId)))!.avatarId!;
    expect((await user.query(api.users.viewer, {}))?.imageUrl).toBeTruthy();
    expect((await other.query(api.users.viewer, {}))?.imageUrl).toBeNull();
    await user.action(api.users.setPicture, { image: png() });
    const second = (await t.run((ctx) => ctx.db.get(userId)))!.avatarId!;
    expect(second).not.toBe(first);
    expect(await t.run((ctx) => ctx.storage.get(first))).toBeNull();
    await user.mutation(api.users.removePicture, {});
    expect(await t.run((ctx) => ctx.storage.get(second))).toBeNull();
    expect((await user.query(api.users.viewer, {}))?.imageUrl).toBeNull();
    expect((await t.run((ctx) => ctx.db.get(otherId)))?.avatarId).toBeUndefined();
  });

  test("rejects non-PNG, oversized and out-of-bounds data without changing the picture", async () => {
    const { user } = await setup();
    const tooWide = png();
    new DataView(tooWide).setUint32(16, MAX_AVATAR_DIMENSION + 1);
    for (const image of [
      new ArrayBuffer(0),
      new TextEncoder().encode("<svg></svg>").buffer,
      new ArrayBuffer(MAX_AVATAR_BYTES + 1),
      tooWide,
    ]) {
      expect(validAvatar(image)).toBe(false);
      await expect(user.action(api.users.setPicture, { image })).rejects.toThrow("PROFILE_image");
    }
    expect((await user.query(api.users.viewer, {}))?.imageUrl).toBeNull();
    expect(validAvatar(png())).toBe(true);
  });
});
