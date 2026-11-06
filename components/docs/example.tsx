"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, Pencil, Play, RotateCcw, X } from "lucide-react";
import { CodeView } from "@/components/docs/code-view";
import { MiniMap } from "@/components/docs/mini-map";
import {
  DOC_EXAMPLES, DOC_MAPS, describeExpectation, loadDocMap, matchesExpectation, runExample,
  type DocExample, type DocExampleId, type Outcome,
} from "@/lib/docs/examples";

// A példákat ugyanazzal a motorral futtatjuk, mint a szerkesztőben.
export default function Example({ id }: { id: DocExampleId }) {
  const example: DocExample = DOC_EXAMPLES[id];
  const mapId = example.map ?? "corridor";
  const [code, setCode] = useState(example.code);
  const [editing, setEditing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const modified = code !== example.code;
  const good = example.expect.kind === "ok";
  const passed = outcome && !modified ? matchesExpectation(outcome, example.expect) : null;
  const errorLine = outcome?.kind === "syntax" ? outcome.issues[0]?.line
    : outcome?.kind === "run" ? outcome.snapshot.error?.line : undefined;

  function update(value: string) {
    setCode(value);
    setOutcome(null);
  }

  return (
    <figure className="doc-example" aria-labelledby={`ex-${id}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`badge ${good ? "badge-good" : "badge-bad"}`}>{good ? "Helyes" : "Hibás"}</span>
        <figcaption id={`ex-${id}`} className="text-sm font-semibold text-[var(--d-strong)]">{example.title}</figcaption>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea
              aria-label={`${example.title} — szerkeszthető kód`}
              className="code-edit"
              value={code}
              spellCheck={false}
              rows={Math.max(3, code.split("\n").length + 1)}
              onChange={(event) => update(event.target.value)}
            />
          ) : (
            <CodeView code={code} markLine={errorLine} />
          )}
        </div>
        {example.showMap && (
          outcome?.kind === "run"
            ? <MiniMap map={outcome.map} robot={outcome.snapshot.robot} gold={outcome.snapshot.gold} explored={outcome.snapshot.explored} caption="Futás után" />
            : <MiniMap map={loadDocMap(mapId)} caption={`${DOC_MAPS[mapId].name} · kezdőállapot`} />
        )}
      </div>

      <p className="mt-2 text-sm text-[var(--d-muted)]">
        <span className="font-semibold text-[var(--d-text)]">Várt eredmény:</span> {describeExpectation(example.expect)}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button className="dbtn dbtn-primary" onClick={() => setOutcome(runExample(code, mapId))}>
          <Play size={14} aria-hidden /> Futtatás
        </button>
        <button className="dbtn" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>
          <Pencil size={14} aria-hidden /> {editing ? "Kész" : "Szerkesztés"}
        </button>
        {modified && (
          <button className="dbtn" onClick={() => update(example.code)}>
            <RotateCcw size={14} aria-hidden /> Visszaállítás
          </button>
        )}
        <Link className="dbtn" href={{ pathname: "/test", query: { code, map: DOC_MAPS[mapId].text } }}>
          <ExternalLink size={14} aria-hidden /> Megnyitás a szerkesztőben
        </Link>
      </div>

      <div aria-live="polite">
        {outcome && <Result outcome={outcome} passed={passed} />}
      </div>
    </figure>
  );
}

function Result({ outcome, passed }: { outcome: Outcome; passed: boolean | null }) {
  return (
    <div className="mt-3 rounded-md border border-[var(--d-border)] bg-[var(--d-bg)] p-3 text-sm">
      {passed === true && <p className="mb-2 flex items-center gap-1 font-semibold text-[var(--d-good)]"><Check size={16} aria-hidden /> Egyezik a várt eredménnyel</p>}
      {passed === false && <p className="mb-2 flex items-center gap-1 font-semibold text-[var(--d-bad)]"><X size={16} aria-hidden /> Eltér a várt eredménytől</p>}
      {passed === null && <p className="mb-2 text-[var(--d-muted)]">Módosított kód eredménye</p>}

      {outcome.kind === "syntax" ? (
        <>
          <p className="font-semibold text-[var(--d-bad)]">Szintaktikai hiba — a program nem indul el.</p>
          <ul className="mt-1 list-none space-y-0.5 p-0">
            {outcome.issues.map((issue, index) => (
              <li key={index}>
                <span className="font-mono text-xs text-[var(--d-bad)]">{issue.line}. sor, {issue.column}. oszlop · {issue.code}</span>
                <div>{issue.message}</div>
                {issue.hint && <div className="whitespace-pre-line text-xs text-[var(--d-muted)]"><span className="font-semibold">Javaslat:</span> {issue.hint}</div>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {outcome.snapshot.error ? (
            <p>
              <span className="font-mono font-semibold text-[var(--d-bad)]">{outcome.snapshot.error.code}</span>
              <span className="text-[var(--d-muted)]"> · {outcome.snapshot.error.line}. sor, {outcome.snapshot.error.column}. oszlop — </span>
              {outcome.snapshot.error.message}
              {outcome.snapshot.error.hint && (
                <span className="block whitespace-pre-line text-xs text-[var(--d-muted)]"><span className="font-semibold">Javaslat:</span> {outcome.snapshot.error.hint}</span>
              )}
            </p>
          ) : (
            <p className="text-[var(--d-good)]">Hiba nélkül lefutott.</p>
          )}
          <p className="mt-1 text-[var(--d-muted)]">
            Feldolgozott sorok: <span className="font-mono text-[var(--d-text)]">{outcome.snapshot.steps} / 1000</span>
            {" · "}Kibányászott arany: <span className="font-mono text-[var(--d-text)]">{outcome.snapshot.mined}</span>
          </p>
          <div className="mt-2 rounded bg-black/40 p-2 font-mono text-xs">
            {outcome.snapshot.output.length === 0
              ? <span className="text-[var(--d-muted)]">(nincs kimenet)</span>
              : outcome.snapshot.output.map((line, index) => <div key={index}><span className="text-[var(--d-muted)]">&gt; </span>{line}</div>)}
          </div>
        </>
      )}
    </div>
  );
}
