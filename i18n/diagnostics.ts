// A motor üzeneteit nem módosítjuk: a felület külön, kód szerinti magyarázatot ad magyarul.
import type { Diagnostic } from "@/lib/diagnostics";
import { validateMineScript } from "@/lib/minescript";
import type { Locale } from "./locale";
import { MESSAGES } from "./messages";

export function localizedDiagnostic<T extends Diagnostic>(diagnostic: T, locale: Locale): T {
  if (locale === "en") return diagnostic;
  const [message, explanation] = MESSAGES[locale].diagnostics[diagnostic.code];
  const terms = diagnostic.message.match(/“[^”]*”/g)?.join(", ");
  // A konkrét, beírható javítás kód marad; csak valóban érvényes utasítást emelünk át.
  const suggestion = diagnostic.hint?.match(
    /(?:Write(?: for example)?|Compare explicitly|Compute it instead|operators):\s*([\s\S]+)/i,
  )?.[1];
  const code = suggestion && validateMineScript(suggestion).length === 0 ? suggestion : null;
  return {
    ...diagnostic,
    message: terms ? `${message} ${terms}` : message,
    hint: code ? `${explanation}\n${code}` : explanation,
    related: diagnostic.related?.map((related) => ({ ...related, message: "" })),
  };
}
