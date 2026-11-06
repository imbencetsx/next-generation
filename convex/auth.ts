// Bejelentkezés felhasználónévvel és jelszóval (Convex Auth).
// A beépített Password provider e-mailhez köti a fiókot; nekünk felhasználónév kell.

import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import {
  AUTH_MESSAGES,
  AUTH_PROVIDER,
  MAX_PASSWORD_LENGTH,
  normalizeUsername,
  passwordProblem,
  usernameProblem,
} from "./credentials";

const scrypt = new Scrypt();

async function accountExists(ctx: GenericActionCtx<GenericDataModel>, username: string) {
  try {
    await retrieveAccount(ctx, { provider: AUTH_PROVIDER, account: { id: username } });
    return true;
  } catch {
    return false;
  }
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ConvexCredentials({
      id: AUTH_PROVIDER,
      crypto: {
        hashSecret: (password) => scrypt.hash(password),
        verifySecret: (password, hash) => scrypt.verify(hash, password),
      },
      authorize: async (params, ctx) => {
        const username = normalizeUsername(params.username);
        const password = typeof params.password === "string" ? params.password : "";

        if (params.flow === "signUp") {
          const problem = usernameProblem(username) ?? passwordProblem(password);
          if (problem) throw new ConvexError(problem);
          // A createAccount meglévő névnél helyes jelszóval beléptetne, hibással „already exists”-et dob:
          // így a regisztráció a zárolást megkerülő jelszópróbálgatásra adna módot. Ezért előbb ellenőrzünk.
          if (await accountExists(ctx, username)) throw new ConvexError(AUTH_MESSAGES.taken);
          try {
            const { user } = await createAccount(ctx, {
              provider: AUTH_PROVIDER,
              account: { id: username, secret: password },
              profile: { name: username },
            });
            return { userId: user._id };
          } catch (error) {
            // Két egyidejű regisztráció ugyanarra a névre.
            if (error instanceof Error && error.message.includes("already exists")) {
              throw new ConvexError(AUTH_MESSAGES.taken);
            }
            throw error;
          }
        }

        if (params.flow === "signIn") {
          if (!username || !password || password.length > MAX_PASSWORD_LENGTH) throw new ConvexError(AUTH_MESSAGES.wrong);
          // Nem áruljuk el, hogy a név vagy a jelszó hibás. Sok hibás próbálkozás után a Convex Auth zárol.
          try {
            const { user } = await retrieveAccount(ctx, { provider: AUTH_PROVIDER, account: { id: username, secret: password } });
            return { userId: user._id };
          } catch (error) {
            const locked = error instanceof Error && error.message.includes("TooManyFailedAttempts");
            throw new ConvexError(locked ? AUTH_MESSAGES.locked : AUTH_MESSAGES.wrong);
          }
        }

        throw new ConvexError("Unknown sign-in flow.");
      },
    }),
  ],
});
