"use client";

// A szerkesztett program és a fájlműveletei: új fájl, példa betöltése, import és export.

import { useState } from "react";
import { EXAMPLES, PROGRAM_EXTENSION as EXTENSION } from "@/lib/minescript";

/** Szöveg letöltése fájlként a böngészőben. */
function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** @param sharedCode A dokumentációból (?code=) érkező program, ha van. */
export function useProgramFile(sharedCode: string | null) {
  const [code, setCode] = useState(sharedCode ?? EXAMPLES[0].code);
  const [filename, setFilename] = useState(sharedCode !== null ? `docs-example${EXTENSION}` : EXAMPLES[0].filename);

  function newFile() {
    setCode("");
    setFilename(`untitled${EXTENSION}`);
  }

  function loadExample(exampleFilename: string) {
    const example = EXAMPLES.find((item) => item.filename === exampleFilename);
    if (!example) return;
    setCode(example.code);
    setFilename(example.filename);
  }

  // A program a szerkesztés alatt lehet hibás (kiírás 3.3), ezért importnál nem ellenőrzünk.
  async function importFile(file: File) {
    setCode(await file.text());
    setFilename(file.name);
  }

  function exportFile() {
    downloadText(code, filename.endsWith(EXTENSION) ? filename : `${filename}${EXTENSION}`);
  }

  return { code, setCode, filename, newFile, loadExample, importFile, exportFile };
}
