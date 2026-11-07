"use client";

// A szerkesztett program és a fájlműveletei: átnevezés, új fájl, példa betöltése, import és export.
// A nevet kiterjesztés nélkül tároljuk; a fájlnév mindig „<név>.mine” (programFilename).

import { useState } from "react";
import { downloadText } from "@/components/download-text";
import { DEFAULT_FILE_NAME } from "@/lib/file-names";
import { EXAMPLES, programFilename, programName } from "@/lib/minescript";

/**
 * @param sharedCode A dokumentációból vagy a térképszerkesztőből (?code=) érkező program, ha van.
 * @param sharedFilename A program fájlneve (?filename=), hogy a térképszerkesztőből visszatérve megmaradjon.
 */
export function useProgramFile(sharedCode: string | null, sharedFilename: string | null = null) {
  const [code, setCode] = useState(sharedCode ?? EXAMPLES[0].code);
  const [name, setName] = useState(() =>
    programName(sharedCode !== null ? sharedFilename || "docs-example" : EXAMPLES[0].filename),
  );

  function rename(text: string) {
    setName(programName(text));
  }

  function newFile() {
    setCode("");
    setName(DEFAULT_FILE_NAME);
  }

  function loadExample(exampleFilename: string) {
    const example = EXAMPLES.find((item) => item.filename === exampleFilename);
    if (!example) return;
    setCode(example.code);
    setName(programName(example.filename));
  }

  // A program a szerkesztés alatt lehet hibás (kiírás 3.3), ezért importnál nem ellenőrzünk.
  async function importFile(file: File) {
    setCode(await file.text());
    setName(programName(file.name));
  }

  const filename = programFilename(name);

  function exportFile() {
    downloadText(code, filename);
  }

  return { code, setCode, name, rename, filename, newFile, loadExample, importFile, exportFile };
}
