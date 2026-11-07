"use client";

// Nyelvi kontextus: a kezdő nyelvet a szerver adja (süti), váltáskor azonnal frissül és elmentjük.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALE_COOKIE, type Locale } from "./locale";
import { MESSAGES, type Messages } from "./messages";

type I18n = { locale: Locale; t: Messages; setLocale: (locale: Locale) => void };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  initialLocale,
  accountLocale,
  children,
}: {
  initialLocale: Locale;
  accountLocale?: Locale | null;
  children: ReactNode;
}) {
  const [selectedLocale, setLocaleState] = useState(initialLocale);
  const locale = accountLocale ?? selectedLocale;

  // A fiók nyelve a következő szerverkéréshez is bekerül a sütibe.
  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <I18nContext.Provider value={{ locale, t: MESSAGES[locale], setLocale }}>
      {/* A lang attribútum miatt a képernyőolvasó a választott nyelven ejti a szöveget. */}
      <div lang={locale} className="contents">
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}
