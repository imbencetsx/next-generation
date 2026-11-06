"use client";

// Futtatható dokumentációs példa: ugyanazzal a motorral fut, mint a szerkesztő, és összeveti a várt eredménnyel.

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Pencil, Play, RotateCcw, XCircle } from "lucide-react";
import { CodeView } from "@/components/docs/code-view";
import { MiniMap } from "@/components/docs/mini-map";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DOC_EXAMPLES, DOC_MAPS, describeExpectation, loadDocMap, matchesExpectation, runExample,
  type DocExample, type DocExampleId, type Outcome,
} from "@/lib/docs/examples";

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
    <figure className="my-7" aria-labelledby={`ex-${id}`}>
      <Card className="gap-0 p-4 font-read">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={good ? "outline" : "destructive"} className="font-pixel">
            {good ? <CheckCircle2 aria-hidden /> : <XCircle aria-hidden />} {good ? "Helyes" : "Hibás"}
          </Badge>
          <figcaption id={`ex-${id}`} className="font-pixel text-[15px]">{example.title}</figcaption>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            {editing ? (
              <textarea
                aria-label={`${example.title}: szerkeszthető kód`}
                className="code-edit pixel-frame"
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
              : <MiniMap map={loadDocMap(mapId)} caption={`${DOC_MAPS[mapId].name}, kezdőállapot`} />
          )}
        </div>

        <p className="mt-3 text-[15px] text-muted-foreground">
          <span className="text-foreground">Várt eredmény:</span> {describeExpectation(example.expect)}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button onClick={() => setOutcome(runExample(code, mapId))}>
            <Play aria-hidden /> Futtatás
          </Button>
          <Button variant="outline" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>
            <Pencil aria-hidden /> {editing ? "Kész" : "Szerkesztés"}
          </Button>
          {modified && (
            <Button variant="outline" onClick={() => update(example.code)}>
              <RotateCcw aria-hidden /> Visszaállítás
            </Button>
          )}
          <Link
            className={buttonVariants({ variant: "ghost" })}
            data-slot="button"
            data-variant="ghost"
            href={{ pathname: "/test", query: { code, map: DOC_MAPS[mapId].text } }}
          >
            <ExternalLink aria-hidden /> Megnyitás a szerkesztőben
          </Link>
        </div>

        <div aria-live="polite">
          {outcome && <Result outcome={outcome} passed={passed} />}
        </div>
      </Card>
    </figure>
  );
}

function Result({ outcome, passed }: { outcome: Outcome; passed: boolean | null }) {
  return (
    <div className="pixel-frame mt-4 bg-code p-3 text-[15px]">
      {passed === true && <p className="mb-2 flex items-center gap-1.5 font-pixel"><CheckCircle2 size={16} aria-hidden /> Egyezik a várt eredménnyel</p>}
      {passed === false && <p className="mb-2 flex items-center gap-1.5 font-pixel text-brick-text"><XCircle size={16} aria-hidden /> Eltér a várt eredménytől</p>}
      {passed === null && <p className="mb-2 font-pixel text-muted-foreground">A módosított kód eredménye</p>}

      {outcome.kind === "syntax" ? (
        <>
          <p className="text-brick-text">Szintaktikai hiba, a program nem indul el.</p>
          <ul className="mt-1 list-none space-y-2 p-0">
            {outcome.issues.map((issue, index) => (
              <li key={index}>
                <span className="font-mono text-xs text-brick-text">{issue.line}. sor, {issue.column}. oszlop: {issue.code}</span>
                <div>{issue.message}</div>
                {issue.hint && <div className="whitespace-pre-line text-sm text-muted-foreground"><span className="text-foreground">Javaslat:</span> {issue.hint}</div>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {outcome.snapshot.error ? (
            <p>
              <span className="font-mono text-brick-text">{outcome.snapshot.error.code}</span>
              <span className="text-muted-foreground"> a {outcome.snapshot.error.line}. sor {outcome.snapshot.error.column}. oszlopában: </span>
              {outcome.snapshot.error.message}
              {outcome.snapshot.error.hint && (
                <span className="block whitespace-pre-line text-sm text-muted-foreground"><span className="text-foreground">Javaslat:</span> {outcome.snapshot.error.hint}</span>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-1.5"><CheckCircle2 size={16} aria-hidden /> Hiba nélkül lefutott.</p>
          )}
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <div className="flex items-baseline gap-1.5"><dt className="text-muted-foreground">Feldolgozott sorok</dt><dd className="display text-lg">{outcome.snapshot.steps}<span className="font-pixel text-xs text-muted-foreground">/1000</span></dd></div>
            <div className="flex items-baseline gap-1.5"><dt className="text-muted-foreground">Kibányászott arany</dt><dd className="display text-lg">{outcome.snapshot.mined}</dd></div>
          </dl>
          <div className="mt-2 border border-border bg-background px-2.5 py-2 font-mono text-xs leading-relaxed">
            {outcome.snapshot.output.length === 0
              ? <span className="text-muted-foreground">(nincs kimenet)</span>
              : outcome.snapshot.output.map((line, index) => <div key={index}><span className="text-muted-foreground" aria-hidden>&gt; </span>{line}</div>)}
          </div>
        </>
      )}
    </div>
  );
}
