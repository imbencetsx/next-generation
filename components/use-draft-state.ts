"use client";

// A piszkozatot csak szerkesztéskor írjuk. A szerver kezdeti állapota hidratáláskor a helyi példányra vált.
import { useEffect, useState, useSyncExternalStore, type SetStateAction } from "react";

type SavedDraft<T> = { context: string; value: T };

export function useDraftState<T>(key: string, context: string, initial: T, parse: (value: unknown) => T | null) {
  const [store] = useState(() => {
    let snapshot = initial;
    let loaded = false;
    let saved = true;
    const listeners = new Set<() => void>();
    function getSnapshot() {
      if (!loaded) {
        loaded = true;
        try {
          const saved: SavedDraft<unknown> | null = JSON.parse(localStorage.getItem(key) ?? "null");
          if (saved?.context === context) snapshot = parse(saved.value) ?? initial;
        } catch {
          // Tiltott vagy megtelt tárhely esetén a szerkesztő memóriában tovább használható.
        }
      }
      return snapshot;
    }
    return {
      getSnapshot,
      isSaved: () => saved,
      getServerSnapshot: () => initial,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      set(value: SetStateAction<T>) {
        const previous = getSnapshot();
        snapshot = typeof value === "function" ? (value as (previous: T) => T)(previous) : value;
        try {
          localStorage.setItem(key, JSON.stringify({ context, value: snapshot }));
          saved = true;
        } catch {
          saved = false;
          // A böngésző tárhelye nem kötelező az alkalmazás használatához.
        }
        listeners.forEach((listener) => listener());
      },
    };
  });
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!store.isSaved()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [store]);
  return [useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot), store.set] as const;
}
