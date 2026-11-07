"use client";

// Nyelvváltó: egyetlen gomb, kattintásra magyar és angol között vált. A látható felirat a mostani nyelv kódja;
// az akadálymentes név és a súgószöveg a CÉL nyelven mondja ki a műveletet (lang attribútummal).

import { Globe } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";

export default function LanguageSwitch() {
  const { locale, t, setLocale } = useI18n();
  const target = locale === "hu" ? "en" : "hu";
  return (
    <Button
      variant="outline"
      size="sm"
      lang={target}
      aria-label={t.switchLanguage}
      title={t.switchLanguage}
      onClick={() => setLocale(target)}
      className="px-2 font-tiny text-sm uppercase"
    >
      <Globe aria-hidden />
      <span lang={locale}>{locale}</span>
    </Button>
  );
}
