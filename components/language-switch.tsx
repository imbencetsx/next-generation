"use client";

// Nyelvváltó: két gomb, a kiválasztott fehér kerettel (aria-pressed). Minden gomb a saját nyelvén olvasható fel.

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { LOCALES } from "@/i18n/locale";

export default function LanguageSwitch() {
  const { locale, t, setLocale } = useI18n();
  return (
    <div role="group" aria-label={t.language} className="flex items-center gap-1">
      {LOCALES.map((option) => (
        <Button
          key={option}
          variant={option === locale ? "outline" : "ghost"}
          size="sm"
          lang={option}
          aria-pressed={option === locale}
          aria-label={t.languageNames[option]}
          onClick={() => setLocale(option)}
          className="px-2 font-mono text-xs uppercase"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
