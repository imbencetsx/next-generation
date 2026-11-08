/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "miner" });
    const otherId = await ctx.db.insert("users", { name: "other" });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 });
    const otherSession = await ctx.db.insert("authSessions", { userId: otherId, expirationTime: Date.now() + 60_000 });
    return { userId, otherId, sessionId, otherSession };
  });
  return {
    t,
    ...ids,
    user: t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` }),
    other: t.withIdentity({ subject: `${ids.otherId}|${ids.otherSession}` }),
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("account robots", () => {
  test("existing accounts use the original robot without being forced through onboarding", async () => {
    const { user } = await setup();
    expect(await user.query(api.users.viewer, {})).toMatchObject({ robot: "balazs", robotSetupPending: false });
  });

  test("all three designs can be saved and read from another session without changing anyone else", async () => {
    const { t, user, other, userId } = await setup();
    const sessionId = await t.run((ctx) =>
      ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60_000 }),
    );
    const secondDevice = t.withIdentity({ subject: `${userId}|${sessionId}` });
    for (const robot of ["levi", "bence", "balazs"] as const) {
      await user.mutation(api.users.setRobot, { robot });
      expect(await secondDevice.query(api.users.viewer, {})).toMatchObject({ robot, robotSetupPending: false });
      expect(await other.query(api.users.viewer, {})).toMatchObject({ robot: "balazs" });
    }
  });

  test("signed-out, revoked and mismatched sessions cannot change the preference", async () => {
    const { t, user, userId, sessionId, otherSession } = await setup();
    await expect(t.mutation(api.users.setRobot, { robot: "bence" })).rejects.toThrow("PROFILE_unauthenticated");
    const forged = t.withIdentity({ subject: `${userId}|${otherSession}` });
    await expect(forged.mutation(api.users.setRobot, { robot: "bence" })).rejects.toThrow("PROFILE_unauthenticated");
    await t.run((ctx) => ctx.db.delete(sessionId));
    await expect(user.mutation(api.users.setRobot, { robot: "bence" })).rejects.toThrow("PROFILE_unauthenticated");
    expect((await t.run((ctx) => ctx.db.get(userId)))?.robot).toBeUndefined();
  });

  test("unknown designs are rejected by the server validator", async () => {
    const { user } = await setup();
    // A kliens típusát megkerülő hívás sem tárolhat ismeretlen robotot.
    // @ts-expect-error A hibás bemenet szándékos.
    await expect(user.mutation(api.users.setRobot, { robot: "red" })).rejects.toThrow();
    expect(await user.query(api.users.viewer, {})).toMatchObject({ robot: "balazs" });
  });

  test("signup starts onboarding once, and signing in later preserves the completed selection", async () => {
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    vi.stubEnv("JWT_PRIVATE_KEY", await exportPKCS8(privateKey));
    vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
    const t = convexTest(schema, modules);
    const params = { username: "newminer", password: "valid-test-password" };
    await t.action(api.auth.signIn, { provider: "username", params: { ...params, flow: "signUp" } });
    const account = await t.run(async (ctx) => {
      const user = (await ctx.db.query("users").take(1))[0];
      const session = (
        await ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", user._id))
          .take(1)
      )[0];
      return { user, session };
    });
    expect(account.user).toMatchObject({ robot: "balazs", robotSetupPending: true });
    const user = t.withIdentity({ subject: `${account.user._id}|${account.session._id}` });
    await user.mutation(api.users.setRobot, { robot: "levi" });
    await t.action(api.auth.signIn, { provider: "username", params: { ...params, flow: "signIn" } });
    expect(await user.query(api.users.viewer, {})).toMatchObject({ robot: "levi", robotSetupPending: false });
  });
});
