// Az eredmények rögzítésének korlátai és fordítható hibakódjai, közösen a szerver és a felület számára.

import { codedError, errorKeyFrom, RESULT_ERROR_PREFIX } from "./errors";

/** Ennél hosszabb programot nem rögzítünk (bőven elég 1000 feldolgozható sorhoz). */
export const MAX_RECORDED_CODE_LENGTH = 20_000;

/** A térkép ranglista-oldalán legfeljebb ennyi játékos látszik. */
export const LEADERBOARD_SIZE = 50;

export const RESULT_ERRORS = ["unauthenticated", "notFound", "syntax", "tooLong", "generic"] as const;
export type ResultErrorKey = (typeof RESULT_ERRORS)[number];

export const resultError = (key: ResultErrorKey) => codedError(RESULT_ERROR_PREFIX, key);

export const resultErrorKey = (error: unknown): ResultErrorKey =>
  errorKeyFrom(error, RESULT_ERROR_PREFIX, RESULT_ERRORS) ?? "generic";
