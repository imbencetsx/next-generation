"use client";

import { useState } from "react";
import { Check, ScanSearch, X } from "lucide-react";
import { MiniMap } from "@/components/docs/mini-map";
import { parseMap, type MapParseResult } from "@/lib/robot-map";

/** An editable map file that is checked with the real map parser. */
export default function MapExample({ title, text, valid }: { title: string; text: string; valid: boolean }) {
  const [value, setValue] = useState(text);
  const [result, setResult] = useState<MapParseResult | null>(null);
  const modified = value !== text;
  const passed = result && !modified ? result.ok === valid : null;

  return (
    <figure className="doc-example">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`badge ${valid ? "badge-good" : "badge-bad"}`}>{valid ? "Érvényes" : "Érvénytelen"}</span>
        <figcaption className="text-sm font-semibold text-[var(--d-strong)]">{title}</figcaption>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <textarea
          aria-label={`${title} — térképfájl`}
          className="code-edit md:max-w-xs"
          value={value}
          spellCheck={false}
          rows={value.split("\n").length + 1}
          onChange={(event) => { setValue(event.target.value); setResult(null); }}
        />
        <div aria-live="polite" className="min-w-0 flex-1 text-sm">
          {result?.ok && <MiniMap map={result.map} caption="Betöltve" />}
          {result && !result.ok && <p className="text-[var(--d-bad)]">{result.error}</p>}
          {passed === true && <p className="mt-2 flex items-center gap-1 font-semibold text-[var(--d-good)]"><Check size={16} aria-hidden /> Egyezik a várt eredménnyel</p>}
          {passed === false && <p className="mt-2 flex items-center gap-1 font-semibold text-[var(--d-bad)]"><X size={16} aria-hidden /> Eltér a várt eredménytől</p>}
        </div>
      </div>
      <button className="dbtn dbtn-primary mt-2" onClick={() => setResult(parseMap(value))}>
        <ScanSearch size={14} aria-hidden /> Ellenőrzés
      </button>
    </figure>
  );
}
