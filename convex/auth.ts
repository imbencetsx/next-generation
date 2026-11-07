// Bejelentkezés felhasználónévvel és jelszóval (Convex Auth).
// A beépített Password provider e-mailhez köti a fiókot; nekünk felhasználónév kell.

import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { Scrypt } from "lucia";
import { internal } from "./_generated/api";
import {
  AUTH_PROVIDER,
  MAX_PASSWORD_LENGTH,
  authError,
  isLockedOut,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
} from "./credentials";

// A jelszó-hash a lucia csomag Scrypt osztályával készül: ugyanezt használja a Convex Auth beépített
// Password providere is, így a hash-formátum szabványos marad. A lucia többi részét nem használjuk.
const scrypt = new Scrypt();

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
          if (!isValidUsername(username)) throw authError("username");
          if (!isValidPassword(password)) throw authError("password");
          // A createAccount meglévő névnél helyes jelszóval beléptetne, hibással „already exists”-et dob:
          // így a regisztráció a zárolást megkerülő jelszópróbálgatásra adna módot. Ezért előbb ellenőrzünk.
          if (await ctx.runQuery(internal.users.isUsernameTaken, { username })) throw authError("taken");
          try {
            const { user } = await createAccount(ctx, {
              provider: AUTH_PROVIDER,
              account: { id: username, secret: password },
              profile: { name: username },
            });
            return { userId: user._id };
          } catch (error) {
            // Két egyidejű regisztráció ugyanarra a névre.
            if (error instanceof Error && error.message.includes("already exists")) throw authError("taken");
            throw error;
          }
        }

        if (params.flow === "signIn") {
          if (!username || !password || password.length > MAX_PASSWORD_LENGTH) throw authError("wrong");
          // Nem áruljuk el, hogy a név vagy a jelszó hibás. Sok hibás próbálkozás után a Convex Auth zárol.
          try {
            const account = { id: username, secret: password };
            const { user } = await retrieveAccount(ctx, { provider: AUTH_PROVIDER, account });
            return { userId: user._id };
          } catch (error) {
            throw authError(isLockedOut(error) ? "locked" : "wrong");
          }
        }

        throw new Error(`Unknown sign-in flow: ${String(params.flow)}`);
      },
    }),
  ],
});
