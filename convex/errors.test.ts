/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import { authError, authErrorKey } from "./credentials";
import { profileError, profileErrorKey } from "./profileRules";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("coded errors", () => {
  test("a thrown code round-trips to its translation key", () => {
    expect(authErrorKey(authError("taken"))).toBe("taken");
    expect(profileErrorKey(profileError("currentPassword"))).toBe("currentPassword");
  });

  test("codes are found inside a proxied server message", () => {
    // A ConvexError üzenete az adat JSON alakja; a /api/auth proxy csak ezt a szöveget adja tovább.
    const thrown = authError("locked");
    const proxied = new Error(`[Request ID: 1] Server Error Uncaught ConvexError: ${thrown.message} at handler`);
    expect(authErrorKey(proxied)).toBe("locked");
  });

  test("a code must match a whole key, not a prefix of a longer one", () => {
    expect(profileErrorKey(new ConvexError({ code: "PROFILE_currentPassword" }))).toBe("currentPassword");
    expect(profileErrorKey(new ConvexError({ code: "PROFILE_passwordX" }))).toBe("generic");
  });

  test("unknown or foreign errors fall back to generic", () => {
    expect(authErrorKey(new Error("network down"))).toBe("generic");
    expect(authErrorKey(profileError("taken"))).toBe("generic");
    expect(profileErrorKey(new ConvexError("PROFILE_taken"))).toBe("generic"); // csak a { code } alak számít
  });
});

describe("sign-up name check", () => {
  test("isUsernameTaken sees only existing password accounts", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "miner" });
      await ctx.db.insert("authAccounts", { userId, provider: "username", providerAccountId: "miner" });
    });
    expect(await t.query(internal.users.isUsernameTaken, { username: "miner" })).toBe(true);
    expect(await t.query(internal.users.isUsernameTaken, { username: "digger" })).toBe(false);
  });
});
