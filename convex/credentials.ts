// Felhasználónév- és jelszószabályok és a bejelentkezés hibakódjai, közösen a szerver és az űrlapok számára.

import { AUTH_ERROR_PREFIX, codedError, errorKeyFrom } from "./errors";

/** A Convex Auth szolgáltató azonosítója (a kliens signIn hívása és a szerver is ezt használja). */
export const AUTH_PROVIDER = "username";

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
/** Kisbetű, számjegy és aláhúzás; a nevet tárolás előtt kisbetűsítjük (normalizeUsername). */
export const USERNAME_PATTERN = new RegExp(`^[a-z0-9_]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`);

export const MIN_PASSWORD_LENGTH = 8;
// Felső korlát, hogy egy óriási jelszó ne terhelje a scrypt hash-elést.
export const MAX_PASSWORD_LENGTH = 128;

/** A bejelentkezés és a regisztráció hibái; a szövegük az i18n auth.errors alatt van. */
export const AUTH_ERRORS = ["username", "password", "taken", "wrong", "locked"] as const;
export type AuthError = (typeof AUTH_ERRORS)[number];
export type AuthErrorKey = AuthError | "generic";

export const authError = (key: AuthError) => codedError(AUTH_ERROR_PREFIX, key);

/** Egy elkapott bejelentkezési hibából a fordítási kulcs; ismeretlen hibánál "generic". */
export const authErrorKey = (error: unknown): AuthErrorKey =>
  errorKeyFrom(error, AUTH_ERROR_PREFIX, AUTH_ERRORS) ?? "generic";

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

/**
 * A Convex Auth retrieveAccount-ja sikertelen ellenőrzésnél `new Error(ok)` hibát dob, ahol az ok egy rögzített
 * érték: "InvalidAccountId" | "TooManyFailedAttempts" | "InvalidSecret" (retrieveAccountWithCredentials).
 * Sok hibás jelszó után a fiók átmenetileg zárolva van.
 */
const LOCKED_OUT_REASON = "TooManyFailedAttempts";

export function isLockedOut(error: unknown): boolean {
  return error instanceof Error && error.message === LOCKED_OUT_REASON;
}
