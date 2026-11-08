"use client";

// A térképszerkesztő fejlécének első sora, a kódszerkesztőével azonos felépítésben: balra a szerkeszthető
// térképnév (a .map kiterjesztés rögzített), középen a fájlműveletek, jobbra a mintapálya-választó.

import { useRef } from "react";
import FileNameField from "@/components/file-name-field";
import { Download, NewFile, Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useI18n } from "@/i18n/i18n-provider";
import { MAP_EXTENSION } from "@/lib/map-editor";
import { MAP_PRESETS } from "@/lib/robot-map";
import type { useMapDocument } from "./use-map-document";

type Props = { file: ReturnType<typeof useMapDocument> };

export default function FileToolbar({ file }: Props) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);

  function importSelected(input: HTMLInputElement) {
    void file.importFile(input.files?.[0]);
    // Ugyanaz a fájl újra kiválasztható legyen.
    input.value = "";
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-border px-2 py-2 md:flex-nowrap">
      <FileNameField
        id="map-name"
        label={t.mapEditor.filename}
        value={file.document.name}
        extension={MAP_EXTENSION}
        onChange={file.rename}
      />

      <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
        {/* Szűk képernyőn csak az ikon látszik; a felirat a képernyőolvasónak megmarad. */}
        <Button variant="ghost" size="sm" onClick={file.newFile} title={t.editor.new}>
          <NewFile aria-hidden /> <span className="max-2xl:sr-only">{t.editor.new}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} title={t.editor.import}>
          <Upload aria-hidden /> <span className="max-2xl:sr-only">{t.editor.import}</span>
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".map,.txt,text/plain"
          aria-label={t.editor.import}
          hidden
          onChange={(event) => importSelected(event.target)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={file.exportFile}
          disabled={!file.document.validation.ok}
          title={t.editor.export}
          aria-describedby="map-export-hint"
        >
          <Download aria-hidden /> <span className="max-2xl:sr-only">{t.editor.export}</span>
        </Button>
      </div>

      <div className="shrink-0">
        <label htmlFor="map-preset" className="sr-only">
          {t.editor.loadExample}
        </label>
        {/* Mindig az üres opció látszik: a választás egy művelet, nem állapot. */}
        <NativeSelect
          id="map-preset"
          size="sm"
          className="w-44"
          value=""
          onChange={(event) => file.loadPreset(MAP_PRESETS[Number(event.target.value)])}
        >
          <NativeSelectOption value="" disabled>
            {t.editor.loadExample}
          </NativeSelectOption>
          {MAP_PRESETS.map((preset, index) => (
            <NativeSelectOption key={preset.name} value={index}>
              {t.sim.maps[preset.name] ?? preset.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
