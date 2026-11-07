// Kódolt hibák a kliens felé. A szerver nem mondatot küld, hanem egy kódot (pl. "PROFILE_taken") a
// ConvexError adatában ({ code }), a kliens pedig ebből választ fordítást a felület nyelvén
// (i18n: auth.errors, profile.errors).
//
// Két út van a klienshez:
//   - a profil függvényei közvetlenül a Convex klienstől jönnek: ott a hiba adata (`error.data.code`) olvasható;
//   - a bejelentkezés a Next.js proxyn (/api/auth) át megy, ami csak a hibaüzenet szövegét adja tovább
//     (@convex-dev/auth/nextjs proxy.js: `{ error: error.message }`). A ConvexError üzenete az adat
//     JSON alakját tartalmazza, ezért ilyenkor abból olvassuk ki a kódot.

import { ConvexError } from "convex/values";

export const AUTH_ERROR_PREFIX = "AUTH_";
export const PROFILE_ERROR_PREFIX = "PROFILE_";

export type CodedErrorData = { code: string };

/** Kliensnek szóló hiba: `throw codedError(PROFILE_ERROR_PREFIX, "taken")`. */
export function codedError(prefix: string, key: string): ConvexError<CodedErrorData> {
  return new ConvexError({ code: `${prefix}${key}` });
}

/** A hiba kódja: a ConvexError adatából, vagy (proxyn átjött hibánál) az üzenet szövegéből. */
function errorCode(error: unknown): string | null {
  if (error instanceof ConvexError && typeof error.data?.code === "string") return error.data.code;
  const text = error instanceof Error ? error.message : String(error);
  return /"code":"([A-Za-z_]+)"/.exec(text)?.[1] ?? null;
}

/** Egy elkapott hibából az ismert kulcs (a `prefix` nélkül), vagy null, ha nem ilyen kódolt hiba. */
export function errorKeyFrom<Key extends string>(error: unknown, prefix: string, keys: readonly Key[]): Key | null {
  const code = errorCode(error);
  return keys.find((key) => code === `${prefix}${key}`) ?? null;
}
