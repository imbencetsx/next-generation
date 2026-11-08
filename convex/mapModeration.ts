// A szűrés összehasonlító alakja külön él a játékos által megadott, megjelenített névtől.
import { mapError } from "./mapRules";

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  "$": "s",
  "!": "i",
};

export function normalizedModerationName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\p{M}\p{Default_Ignorable_Code_Point}]/gu, "")
    .replace(/[0134578@$!]/g, (char) => LEET[char])
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Szándékosan nem részsztringeket tiltunk: például a „Scunthorpe” és a „homok” ártalmatlan név.
const BLOCKED_WORDS = [
  "fuck",
  "fucks",
  "fucked",
  "fucker",
  "fuckers",
  "fucking",
  "fuckyou",
  "motherfucker",
  "fck",
  "shit",
  "shits",
  "shitty",
  "shithead",
  "bullshit",
  "bitch",
  "bitches",
  "asshole",
  "assholes",
  "cunt",
  "cunts",
  "dickhead",
  "nigger",
  "niggers",
  "nigga",
  "faggot",
  "faggots",
  "baszdmeg",
  "bazdmeg",
  "baszmeg",
  "baszni",
  "baszik",
  "bassza",
  "basszameg",
  "baszod",
  "kurva",
  "kurvak",
  "kurvaja",
  "kurvamat",
  "kurvaanyad",
  "kurvaanyadat",
  "fasz",
  "faszok",
  "faszom",
  "faszod",
  "faszfej",
  "faszfejek",
  "faszszopo",
  "faszszopok",
  "geci",
  "gecik",
  "gecis",
  "gecifej",
  "picsa",
  "picsak",
  "picsaba",
  "pina",
  "pinak",
  "buzi",
  "buzik",
  "kocsog",
  "kocsogok",
  "seggfej",
  "seggfejek",
];
const squash = (word: string) => word.replace(/([a-z])\1+/g, "$1");
const blocked = new Set(BLOCKED_WORDS.map(squash));

export function hasBlockedMapName(name: string): boolean {
  const tokens = normalizedModerationName(name).split(" ");
  // A különírt betűk („f.u.c.k”, „f u c k”) egy szónak számítanak az ellenőrzésben.
  const joinedLetters = tokens.join(" ").replace(/\b[a-z](?: [a-z])+\b/g, (letters) => letters.replaceAll(" ", ""));
  const words = [...tokens, ...joinedLetters.split(" ")];
  if (words.some((word) => blocked.has(squash(word)))) return true;
  const phrase = ` ${tokens.map(squash).join(" ")} `;
  return ["baszd meg", "bazd meg", "basz meg", "kurva anyad", "kurva anyadat"].some((blockedPhrase) =>
    phrase.includes(` ${blockedPhrase} `),
  );
}

export const MODERATION_MODEL = "omni-moderation-latest";
export const MODERATION_TIMEOUT_MS = 8000;
const MODERATION_ENDPOINT = "https://api.openai.com/v1/moderations";

type ModerationResult = { flagged: boolean };
function validResults(value: unknown, count: number): value is { results: ModerationResult[] } {
  if (
    !value ||
    typeof value !== "object" ||
    !("results" in value) ||
    !Array.isArray(value.results) ||
    value.results.length !== count
  ) {
    return false;
  }
  return value.results.every(
    (result: unknown) =>
      result !== null && typeof result === "object" && "flagged" in result && typeof result.flagged === "boolean",
  );
}

/** Ismeretlen, hibás vagy időtúllépéses válasz soha nem jelent engedélyt a közzétételre. */
export async function checkMapNameWithAI(name: string, apiKey: string | undefined): Promise<void> {
  if (!apiKey?.trim()) throw mapError("moderationUnavailable");
  const input = [...new Set([name, normalizedModerationName(name)])];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
  let results: ModerationResult[];
  try {
    const response = await fetch(MODERATION_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODERATION_MODEL, input }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Moderation unavailable");
    const value: unknown = await response.json();
    if (!validResults(value, input.length)) throw new Error("Invalid moderation response");
    results = value.results;
  } catch {
    throw mapError("moderationUnavailable");
  } finally {
    clearTimeout(timer);
  }
  if (results.some((result) => result.flagged)) throw mapError("moderated");
}
