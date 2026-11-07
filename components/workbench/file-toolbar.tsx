"use client";

// A szerkesztő fejlécének első sora: balra a szerkeszthető programnév (a .mine kiterjesztés rögzített),
// középen a fájlműveletek, jobbra a példaválasztó.

import { useRef } from "react";
import FileNameField from "@/components/file-name-field";
import { Download, NewFile, Upload, Wrap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useI18n } from "@/i18n/i18n-provider";
import { EXAMPLES, PROGRAM_EXTENSION } from "@/lib/minescript";

type Props = {
  /** A programnév kiterjesztés nélkül. */
  name: string;
  onRename: (name: string) => void;
  /** Futás közben a program nem cserélhető le. */
  locked: boolean;
  wrap: boolean;
  onToggleWrap: () => void;
  onNew: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onLoadExample: (filename: string) => void;
};

export default function FileToolbar({
  name,
  onRename,
  locked,
  wrap,
  onToggleWrap,
  onNew,
  onImport,
  onExport,
  onLoadExample,
}: Props) {
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
        <Button variant="outline" size="sm" aria-pressed={wrap} onClick={onToggleWrap} title={t.editor.wrap}>
          <Wrap aria-hidden /> <span className="max-2xl:sr-only">{t.editor.wrap}</span>
        </Button>
      </div>

      <div className="shrink-0">
        <label className="sr-only" htmlFor="example">
          {t.editor.loadExample}
        </label>
        {/* Mindig az üres opció látszik: a választás egy művelet, nem állapot. */}
        <NativeSelect
          id="example"
          size="sm"
          className="w-44"
          disabled={locked}
          value=""
          onChange={(event) => onLoadExample(event.target.value)}
        >
          <NativeSelectOption value="" disabled>
            {t.editor.loadExample}
          </NativeSelectOption>
          {EXAMPLES.map((example) => (
            <NativeSelectOption key={example.filename} value={example.filename}>
              {t.editor.examples[example.filename] ?? example.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
