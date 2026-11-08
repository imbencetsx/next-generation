"use client";

// A szerkesztett program és a fájlműveletei: átnevezés, új fájl, példa betöltése, import és export.
// A nevet kiterjesztés nélkül tároljuk; a fájlnév mindig „<név>.mine” (programFilename).

import { useRef, useState } from "react";
import { useDraftState } from "@/components/use-draft-state";
import { useReplaceConfirmation } from "@/components/use-replace-confirmation";
import { downloadText } from "@/components/download-text";
import { DEFAULT_FILE_NAME } from "@/lib/file-names";
import { EXAMPLES, programFilename, programName } from "@/lib/minescript";

/**
 * @param sharedCode A dokumentációból vagy a térképszerkesztőből (?code=) érkező program, ha van.
 * @param sharedFilename A program fájlneve (?filename=), hogy a térképszerkesztőből visszatérve megmaradjon.
 */
export function useProgramFile(sharedCode: string | null, sharedFilename: string | null = null, documentId = "") {
  const operation = useRef(0);
  const initial = {
    code: sharedCode ?? EXAMPLES[0].code,
    name: programName(sharedCode !== null ? sharedFilename || "docs-example" : EXAMPLES[0].filename),
  };
  const [document, setDocument] = useDraftState(
    "minescript:program-draft:v1",
    JSON.stringify([sharedCode, sharedFilename, documentId]),
    initial,
    (value) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("code" in value) ||
        !("name" in value) ||
        typeof value.code !== "string" ||
        typeof value.name !== "string"
      ) {
        return null;
      }
      return { code: value.code, name: programName(value.name) };
    },
  );
  const { code, name } = document;
  const [baseline, setBaseline] = useState(initial);
  const replacement = useReplaceConfirmation(code !== baseline.code || name !== baseline.name);
  function setCode(code: string) {
    operation.current++;
    setDocument((previous) => ({ ...previous, code }));
  }
  function setName(name: string) {
    operation.current++;
    setDocument((previous) => ({ ...previous, name }));
  }
  function replace(next: typeof initial) {
    operation.current++;
    setDocument(next);
    setBaseline(next);
  }

  function rename(text: string) {
    setName(programName(text));
  }

  function newFile(onReplace?: () => void) {
    operation.current++;
    replacement.request(() => {
      replace({ code: "", name: DEFAULT_FILE_NAME });
      onReplace?.();
    });
  }

  function loadExample(exampleFilename: string, onReplace?: () => void) {
    const example = EXAMPLES.find((item) => item.filename === exampleFilename);
    if (!example) return;
    operation.current++;
    replacement.request(() => {
      replace({ code: example.code, name: programName(example.filename) });
      onReplace?.();
    });
  }

  // A program a szerkesztés alatt lehet hibás (kiírás 3.3), ezért importnál nem ellenőrzünk.
  async function importFile(file: File, onReplace?: () => void) {
    const token = ++operation.current;
    const code = await file.text();
    if (token !== operation.current) return;
    replacement.request(() => {
      replace({ code, name: programName(file.name) });
      onReplace?.();
    });
  }

  const filename = programFilename(name);

  function exportFile() {
    downloadText(code, filename);
    setBaseline(document);
  }

  return {
    confirmation: replacement.dialog,
    code,
    setCode,
    name,
    rename,
    filename,
    newFile,
    loadExample,
    importFile,
    exportFile,
  };
}
