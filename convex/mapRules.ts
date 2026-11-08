// A térkép-közzététel szabályai és fordítható hibakódjai, közösen a szerver és a felület számára.

import { codedError, errorKeyFrom, MAP_ERROR_PREFIX } from "./errors";
import { mapName } from "../lib/map-editor";

/** A közzétett térkép neve legfeljebb ennyi karakter (a kártyákon is elférjen). */
export const MAX_PUBLISHED_NAME_LENGTH = 60;

export const MAP_ERRORS = ["unauthenticated", "invalid", "name", "notFound", "forbidden", "generic"] as const;
export type MapErrorKey = (typeof MAP_ERRORS)[number];

/** A kliensnek szóló hiba: `throw mapError("invalid")`. */
export const mapError = (key: MapErrorKey) => codedError(MAP_ERROR_PREFIX, key);

/** Egy elkapott hibából a fordítási kulcs; ismeretlen hibánál "generic". */
export const mapErrorKey = (error: unknown): MapErrorKey =>
  errorKeyFrom(error, MAP_ERROR_PREFIX, MAP_ERRORS) ?? "generic";

/** A közzétett név: ugyanaz a szabály, mint a fájlnévnél, szóközök nélkül a széleken. Érvénytelennél null. */
export function publishedMapName(text: string): string | null {
  // Előbb a szélső szóközöket vágjuk le, hogy a „név.map ” alak kiterjesztése is lejöjjön.
  const name = mapName(text.trim()).trim();
  return name.length >= 1 && name.length <= MAX_PUBLISHED_NAME_LENGTH ? name : null;
}
