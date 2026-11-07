// Az alkalmazás felületi szövegei nyelvenként (en.ts a forrás, hu.ts a fordítás); a komponensek a
// useI18n().t-n keresztül olvassák őket. A motor hibaüzenetei (lib/) szándékosan angolok maradnak,
// a hivatalos hibakóddal együtt.

import { en, type Messages } from "./en";
import { hu } from "./hu";
import type { Locale } from "./locale";

export type { Messages } from "./en";

export const MESSAGES: Record<Locale, Messages> = { en, hu };
