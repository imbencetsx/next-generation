"use client";

// A szerkesztett térképfájl állapota: szöveges és rajzolt szerkesztés, új fájl, mintapálya, import és export.
// A tiszta műveletek a lib/map-editor.ts-ben vannak; ez a hook csak az állapotot és a fájlkezelést adja hozzá.

import { useRef, useState } from "react";
import { useDraftState } from "@/components/use-draft-state";
import { useReplaceConfirmation } from "@/components/use-replace-confirmation";
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
import { isValidMapSize } from "@/lib/map-editor";
import type { GameMap } from "@/lib/robot-map";

/** Egy 15×15-ös térkép kb. 250 bájt; ennél jóval nagyobb fájl biztosan nem térkép. */
const MAX_FILE_BYTES = 16 * 1024;
export type FileError = { kind: "read" | "large" } | { kind: "invalid"; message: string };

/**
 * @param initialSource A szimulátorból vagy a kezdőlapról (?map=) érkező térkép, ha van; különben egy új, üres térkép.
 * @param initialName A térkép neve (?mapName=), ha van.
 */
export function useMapDocument(initialSource: string | null, initialName: string | null = null, documentId = "") {
  const initial = createMapDocument(initialSource ?? undefined, initialName ? mapName(initialName) : undefined);
  const [document, setDocument] = useDraftState(
    "minescript:map-draft:v1",
    JSON.stringify([initialSource, initialName, documentId]),
    initial,
    (value) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("source" in value) ||
        !("name" in value) ||
        typeof value.source !== "string" ||
        typeof value.name !== "string"
      ) {
        return null;
      }
      let restored = createMapDocument(undefined, mapName(value.name));
      // Hibás szöveges piszkozat mellé az utolsó érvényes rajzot is visszaállítjuk.
      if ("preview" in value && value.preview && typeof value.preview === "object") {
        const preview = value.preview as GameMap;
        if (isValidMapSize(preview.rows) && isValidMapSize(preview.cols)) {
          try {
            const previous = createMapDocument(formatMap(preview), mapName(value.name));
            if (previous.validation.ok) restored = previous;
          } catch {
            // Sérült helyi adatból nem veszünk át térképet.
          }
        }
      }
      return updateMapDocument(restored, value.source);
    },
  );
  const [baseline, setBaseline] = useState(initial);
  const replacement = useReplaceConfirmation(document.source !== baseline.source || document.name !== baseline.name);
  function replace(next: typeof initial) {
    operation.current++;
    setDocument(next);
    setBaseline(next);
    setFileError(null);
  }
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
    replacement.request(() => replace(createMapDocument(formatMap(createMap()))));
  }

  /** Mintapálya betöltése; a neve fájlnévként (pl. „Open field” → „open-field”). */
  function loadPreset(preset: { name: string; text: string }) {
    operation.current++;
    replacement.request(() =>
      replace(createMapDocument(preset.text, mapName(preset.name.toLowerCase().replaceAll(" ", "-")))),
    );
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
      replacement.request(() => replace(imported.document));
    } catch {
      if (token === operation.current) setFileError({ kind: "read" });
    }
  }

  function rename(text: string) {
    operation.current++;
    setDocument((previous) => ({ ...previous, name: mapName(text) }));
  }

  // Csak érvényes térkép exportálható, mindig .map kiterjesztéssel.
  function exportFile() {
    if (!document.validation.ok) return;
    downloadText(formatMap(document.validation.map), mapFilename(document.name));
    setBaseline(document);
  }

  return {
    confirmation: replacement.dialog,
    document,
    fileError,
    changeSource,
    changeMap,
    newFile,
    loadPreset,
    importFile,
    rename,
    exportFile,
  };
}
