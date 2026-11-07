// A kiírás számszerű korlátai egy helyen (a hivatkozások a „Robotszimulátor Web” PDF fejezeteire mutatnak).

/** A térkép sorainak és oszlopainak legnagyobb száma (1. fejezet, térképfájl). Legalább 1. */
export const MAX_MAP_SIZE = 15;

/** A forráskódban leírható legnagyobb egész literál (2.1). Számolt érték ennél nagyobb is lehet (D6). */
export const MAX_NUMBER_LITERAL = 100;

/** Legfeljebb ennyi programsor dolgozható fel; a következő már INSTRUCTION_COUNT_LIMIT_EXCEEDED (3.4). */
export const MAX_LINES = 1000;
