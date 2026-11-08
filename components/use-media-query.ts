"use client";

// Képernyőméret-figyelés: igaz, ha a médiafeltétel teljesül. Szerveren (és a hidratálásig) hamis, így az asztali
// elrendezés készül el először; kis képernyőn a hidratálás után azonnal átvált.

import { useSyncExternalStore } from "react";

/** A munkafelületek (kódszerkesztő, térképszerkesztő) ez alatt fülekre bomlanak: a Tailwind lg töréspontja alatt. */
export const COMPACT_QUERY = "(max-width: 1023.98px)";
/** Telefonméret (pl. a nagy térképelőnézet ehhez igazodik). */
export const PHONE_QUERY = "(max-width: 479.98px)";

const supported = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!supported()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => supported() && window.matchMedia(query).matches,
    () => false,
  );
}
