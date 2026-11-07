"use client";

// Nyelvváltó: egyetlen gomb, kattintásra magyar és angol között vált. A látható felirat a mostani nyelv kódja;
// az akadálymentes név és a súgószöveg a CÉL nyelven mondja ki a műveletet (lang attribútummal).

import { Globe } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import type { Locale } from "@/i18n/locale";

// A gomb felirata a CÉL nyelven szól (a képernyőolvasó úgy olvassa fel, ahogy a váltás után kell),
// ezért nem a szótárból jön: ott az aktuális nyelv szövegei vannak.
const SWITCH_TO: Record<Locale, string> = { en: "Switch to English", hu: "Váltás magyarra" };

export default function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  const target = locale === "hu" ? "en" : "hu";
  return (
    <Button
      variant="outline"
      size="sm"
      lang={target}
      aria-label={SWITCH_TO[target]}
      title={SWITCH_TO[target]}
      onClick={() => setLocale(target)}
      className="px-2 font-tiny text-sm uppercase"
    >
      <Globe aria-hidden />
      <span lang={locale}>{locale}</span>
    </Button>
  );
}
