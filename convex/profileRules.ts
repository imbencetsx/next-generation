// A profilhoz tartozó korlátok és fordítható hibakódok, közösen a szerver és a profil oldal számára.

import { codedError, errorKeyFrom, PROFILE_ERROR_PREFIX } from "./errors";
import { pngSize } from "./png";

export const MAX_AVATAR_BYTES = 1024 * 1024;
/** A feltöltött eredeti kép legnagyobb mérete, mielőtt a böngésző avatarrá kicsinyítené. */
export const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;
/**
 * A szerver által elfogadott avatar legnagyobb szélessége és magassága pixelben. A böngésző ennél jóval
 * kisebbet, egy sprite-mezőnyi (32×32) képet küld (components/profile/prepare-picture.ts); ez csak felső korlát.
 */
export const MAX_AVATAR_DIMENSION = 256;

export const PROFILE_ERRORS = [
  "unauthenticated",
  "username",
  "taken",
  "password",
  "currentPassword",
  "locked",
  "conflict",
  "image",
  "generic",
] as const;
export type ProfileErrorKey = (typeof PROFILE_ERRORS)[number];

/** A kliensnek szóló hiba: `throw profileError("taken")`. A kliens a kódból választ fordítást. */
export const profileError = (key: ProfileErrorKey) => codedError(PROFILE_ERROR_PREFIX, key);

/** Egy elkapott hibából a fordítási kulcs; ismeretlen hibánál "generic". */
export const profileErrorKey = (error: unknown): ProfileErrorKey =>
  errorKeyFrom(error, PROFILE_ERROR_PREFIX, PROFILE_ERRORS) ?? "generic";

/** Csak a böngészőben előkészített, legfeljebb MAX_AVATAR_DIMENSION méretű PNG fogadható el. */
export function validAvatar(image: ArrayBuffer): boolean {
  if (image.byteLength > MAX_AVATAR_BYTES) return false;
  const size = pngSize(image);
  return size !== null && size.width <= MAX_AVATAR_DIMENSION && size.height <= MAX_AVATAR_DIMENSION;
}
