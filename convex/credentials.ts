// Felhasználónév- és jelszószabályok és hibaüzenetek, közösen a szerver és a bejelentkezési űrlap számára.

/** A Convex Auth szolgáltató azonosítója (a kliens signIn hívása és a szerver is ezt használja). */
export const AUTH_PROVIDER = "username";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 8;
// Felső korlát, hogy egy óriási jelszó ne terhelje a scrypt hash-elést.
export const MAX_PASSWORD_LENGTH = 128;

export const AUTH_MESSAGES = {
  username: "Username must be 3 to 20 characters: letters, digits or underscores.",
  password: `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`,
  taken: "This username is already taken.",
  wrong: "Wrong username or password.",
  locked: "Too many failed attempts. Wait a few minutes and try again.",
} as const;

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function usernameProblem(username: string): string | null {
  return USERNAME_PATTERN.test(username) ? null : AUTH_MESSAGES.username;
}

export function passwordProblem(password: string): string | null {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH ? null : AUTH_MESSAGES.password;
}

/** A szerver hibájából a felhasználónak szóló üzenet (a Next.js proxy csak a nyers szöveget adja tovább). */
export function authMessageFrom(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return Object.values(AUTH_MESSAGES).find((message) => text.includes(message)) ?? "Could not sign in. Please try again.";
}
