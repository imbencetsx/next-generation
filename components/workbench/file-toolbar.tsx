"use client";

// A szerkesztő fejlécének első sora: balra a szerkeszthető programnév (a .mine kiterjesztés rögzített),
// mellette az új fájl, import és export.

import { useRef } from "react";
import FileNameField from "@/components/file-name-field";
import { Download, NewFile, Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { PROGRAM_EXTENSION } from "@/lib/minescript";

type Props = {
  /** A programnév kiterjesztés nélkül. */
  name: string;
  onRename: (name: string) => void;
  /** Futás közben a program nem cserélhető le. */
  locked: boolean;
  onNew: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
};

export default function FileToolbar({ name, onRename, locked, onNew, onImport, onExport }: Props) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);

  function importSelected(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (file) onImport(file);
    // Ugyanaz a fájl újra kiválasztható legyen.
    input.value = "";
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 md:flex-nowrap">
      <FileNameField
        id="program-name"
        label={t.editor.programName}
        value={name}
        extension={PROGRAM_EXTENSION}
        onChange={onRename}
      />

      <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
        {/* Szűk képernyőn csak az ikon látszik; a felirat a képernyőolvasónak megmarad. */}
        <Button variant="ghost" size="sm" disabled={locked} onClick={onNew} title={t.editor.new}>
          <NewFile aria-hidden /> <span className="max-2xl:sr-only">{t.editor.new}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked}
          onClick={() => fileInput.current?.click()}
          title={t.editor.import}
        >
          <Upload aria-hidden /> <span className="max-2xl:sr-only">{t.editor.import}</span>
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".mine,.txt,text/plain"
          hidden
          onChange={(event) => importSelected(event.target)}
        />
        <Button variant="ghost" size="sm" onClick={onExport} title={t.editor.export}>
          <Download aria-hidden /> <span className="max-2xl:sr-only">{t.editor.export}</span>
        </Button>
      </div>
    </div>
  );
}
