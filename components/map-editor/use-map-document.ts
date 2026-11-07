"use client";

// A szerkesztett térképfájl állapota: szöveges és rajzolt szerkesztés, új fájl, mintapálya, import és export.
// A tiszta műveletek a lib/map-editor.ts-ben vannak; ez a hook csak az állapotot és a fájlkezelést adja hozzá.

import { useRef, useState } from "react";
import { downloadText } from "@/components/download-text";
import {
  createMap,
  createMapDocument,
  formatMap,
  importMapDocument,
  mapFilename,
  mapName,
  updateMapDocument,
} from "@/lib/map-editor";
import type { GameMap } from "@/lib/robot-map";

/** Egy 15×15-ös térkép kb. 250 bájt; ennél jóval nagyobb fájl biztosan nem térkép. */
const MAX_FILE_BYTES = 16 * 1024;
export type FileError = { kind: "read" | "large" } | { kind: "invalid"; message: string };

/**
 * @param initialSource A szimulátorból vagy a kezdőlapról (?map=) érkező térkép, ha van; különben egy új, üres térkép.
 * @param initialName A térkép neve (?mapName=), ha van.
 */
export function useMapDocument(initialSource: string | null, initialName: string | null = null) {
  const [document, setDocument] = useState(() =>
    createMapDocument(initialSource ?? undefined, initialName ? mapName(initialName) : undefined),
  );
  const [fileError, setFileError] = useState<FileError | null>(null);
  // Egy lassú import nem írhatja felül a közben létrehozott vagy szerkesztett térképet.
  const operation = useRef(0);

  function changeSource(source: string) {
    operation.current++;
    setDocument((previous) => updateMapDocument(previous, source));
    setFileError(null);
  }

  function changeMap(map: GameMap) {
    changeSource(formatMap(map));
  }

  function newFile() {
    operation.current++;
    setDocument(createMapDocument(formatMap(createMap())));
    setFileError(null);
  }

  /** Mintapálya betöltése; a neve fájlnévként (pl. „Open field” → „open-field”). */
  function loadPreset(preset: { name: string; text: string }) {
    operation.current++;
    setDocument(createMapDocument(preset.text, mapName(preset.name.toLowerCase().replaceAll(" ", "-"))));
    setFileError(null);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const token = ++operation.current;
    if (file.size > MAX_FILE_BYTES) return setFileError({ kind: "large" });
    try {
      const source = await file.text();
      if (token !== operation.current) return;
      const imported = importMapDocument(document, source, file.name);
      if (!imported.ok) return setFileError({ kind: "invalid", message: imported.error });
      setDocument(imported.document);
      setFileError(null);
    } catch {
      if (token === operation.current) setFileError({ kind: "read" });
    }
  }

  function rename(text: string) {
    setDocument((previous) => ({ ...previous, name: mapName(text) }));
  }

  // Csak érvényes térkép exportálható, mindig .map kiterjesztéssel.
  function exportFile() {
    if (!document.validation.ok) return;
    downloadText(formatMap(document.validation.map), mapFilename(document.name));
  }

  return { document, fileError, changeSource, changeMap, newFile, loadPreset, importFile, rename, exportFile };
}
