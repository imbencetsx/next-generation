// A felület nyelvei. A választás sütiben él, hogy a szerver is a jó nyelven rendereljen (villanás nélkül).

export const LOCALES = ["en", "hu"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "lang";

/** A mentett választást használjuk; ennek híján magyar a felület. */
export function resolveLocale(cookie: string | undefined): Locale {
  return cookie === "en" ? "en" : "hu";
}
