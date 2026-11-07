"use client";

// Térképfájl-példa: a beolvasó (parseMap) dönti el, érvényes-e; a várt eredménnyel összevetjük.

import { useState } from "react";
import { Check, Cross, Search } from "@/components/icons";
import { MiniMap } from "@/components/docs/mini-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseMap, type MapParseResult } from "@/lib/robot-map";

export default function MapExample({ title, text, valid }: { title: string; text: string; valid: boolean }) {
  const [value, setValue] = useState(text);
  const [result, setResult] = useState<MapParseResult | null>(null);
  const modified = value !== text;
  const passed = result && !modified ? result.ok === valid : null;

  return (
    <figure className="my-7">
      <Card className="gap-0 p-4 font-read">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={valid ? "outline" : "destructive"} className="font-pixel">
            {valid ? <Check aria-hidden /> : <Cross aria-hidden />} {valid ? "Érvényes" : "Érvénytelen"}
          </Badge>
          <figcaption className="font-pixel text-[15px]">{title}</figcaption>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <textarea
            aria-label={`${title}: térképfájl`}
            className="code-edit pixel-frame md:max-w-xs"
            value={value}
            spellCheck={false}
            rows={value.split("\n").length + 1}
            onChange={(event) => {
              setValue(event.target.value);
              setResult(null);
            }}
          />
          <div aria-live="polite" className="min-w-0 flex-1 text-[15px]">
            {result?.ok && <MiniMap map={result.map} caption="Betöltve" />}
            {result && !result.ok && <p className="text-brick-text">{result.error}</p>}
            {passed === true && (
              <p className="mt-2 flex items-center gap-1.5 font-pixel">
                <Check size={16} aria-hidden /> Egyezik a várt eredménnyel
              </p>
            )}
            {passed === false && (
              <p className="mt-2 flex items-center gap-1.5 font-pixel text-brick-text">
                <Cross size={16} aria-hidden /> Eltér a várt eredménytől
              </p>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={() => setResult(parseMap(value))}>
            <Search aria-hidden /> Ellenőrzés
          </Button>
        </div>
      </Card>
    </figure>
  );
}
