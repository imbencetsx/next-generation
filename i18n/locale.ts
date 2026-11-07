// A felület nyelvei. A választás sütiben él, hogy a szerver is a jó nyelven rendereljen (villanás nélkül).

export const LOCALES = ["en", "hu"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "lang";

/** Süti értékéből vagy Accept-Language fejlécből; ismeretlen esetben angol. */
export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (cookie === "en" || cookie === "hu") return cookie;
  // Könnyűsúlyú alapérték: az első nyelvi címkét nézzük, nem értékeljük a q súlyokat. A süti mindig elsőbbséget élvez.
  return acceptLanguage?.toLowerCase().startsWith("hu") ? "hu" : "en";
}
