"use client";

// A kódszerkesztő, a fájlkezelés és a szimulátor közös felülete.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Book, Check, Download, FileIcon, Lock, NewFile, Upload, Wrap } from "@/components/icons";
import UserMenu from "@/components/auth/user-menu";
import LanguageSwitch from "@/components/language-switch";
import Logo from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import CodeEditor, { type ActiveLine, type EditorHandle } from "@/components/code-editor";
import PlaybackBar from "@/components/playback-bar";
import RunConsole from "@/components/run-console";
import Simulator from "@/components/simulator";
import { useSimulation } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import { EXAMPLES, validateMineScript } from "@/lib/minescript";

// A szintaxis nem fordítandó; a leírás a szótárból jön.
const REFERENCE = [
  ["set <name> to <expr>", "set"],
  ["step forward <v>", "step"],
  ["turn by <v>", "turn"],
  ["mine here", "mine"],
  ["print <v>", "print"],
  ["if <v>  /  else", "if"],
  ["while <v>", "while"],
] as const;

export default function Workbench() {
  const { t } = useI18n();
  const params = useSearchParams();
  const sharedCode = params.get("code");
  const [code, setCode] = useState(sharedCode ?? EXAMPLES[0].code);
  const [filename, setFilename] = useState(sharedCode !== null ? "docs-example.mine" : EXAMPLES[0].filename);
  const [wrap, setWrap] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const editor = useRef<EditorHandle | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const issues = useMemo(() => validateMineScript(code), [code]);
  const simulation = useSimulation(code, params.get("map"));
  const { snapshot, locked } = simulation;
  const activeLine: ActiveLine =
    snapshot.line && (snapshot.status === "running" || snapshot.status === "error")
      ? snapshot.status === "error" && snapshot.error
        ? { line: snapshot.error.line, tone: "error", column: snapshot.error.column, endColumn: snapshot.error.endColumn }
        : { line: snapshot.line, tone: "run" }
      : null;

  const lineCount = code.split("\n").length;

  // Hibás programnál a futtatás nem indul el; ilyenkor az első hibára ugrunk, hogy látszódjon, mit kell javítani.
  function showFirstIssue() {
    if (issues[0]) editor.current?.focusLine(issues[0].line, issues[0].column);
  }

  function newFile() {
    setCode("");
    setFilename("untitled.mine");
    simulation.reset();
  }

  function loadExample(event: ChangeEvent<HTMLSelectElement>) {
    const example = EXAMPLES.find((item) => item.filename === event.target.value);
    if (!example) return;

    setCode(example.code);
    setFilename(example.filename);
  }

  function exportFile() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".mine") ? filename : `${filename}.mine`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;

    setCode(await file.text());
    setFilename(file.name);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="app-ui flex h-dvh flex-col">
      <header className="topbar">
        <div className="flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-1.5">
          <h1 className="flex">
            <Logo />
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Link className={buttonVariants({ variant: "ghost" })} data-slot="button" data-variant="ghost" href="/docs">
              <Book aria-hidden /> <span className="max-sm:sr-only">{t.editor.docs}</span>
            </Link>
            <LanguageSwitch />
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-2 lg:overflow-hidden">
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <Card role="region" aria-label={t.editor.region} className="min-h-[320px] min-w-0 flex-1 gap-0 py-0">
            {/* Első sor: a fájl és műveletei; alatta a futás vezérlői. A program és a futtatása így egy helyen van. */}
            <div className="flex flex-col gap-2 border-b border-border px-2 py-2">
            {/* Bal szélen a fájlnév, jobb szélen a példaválasztó, köztük középen a fájlműveletek. */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 md:flex-nowrap">
              <span className="flex min-w-0 shrink items-center gap-1.5 pl-1 font-mono text-xs md:max-w-48">
                <FileIcon size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{filename}</span>
              </span>
              <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
                <Button variant="ghost" size="sm" disabled={locked} onClick={newFile} title={t.editor.new}>
                  <NewFile aria-hidden /> <span className="max-2xl:sr-only">{t.editor.new}</span>
                </Button>
                <Button variant="ghost" size="sm" disabled={locked} onClick={() => fileInput.current?.click()} title={t.editor.import}>
                  <Upload aria-hidden /> <span className="max-2xl:sr-only">{t.editor.import}</span>
                </Button>
                <input ref={fileInput} type="file" accept=".mine,.txt,text/plain" hidden onChange={(event) => importFile(event.target.files?.[0])} />
                <Button variant="ghost" size="sm" onClick={exportFile} title={t.editor.export}>
                  <Download aria-hidden /> <span className="max-2xl:sr-only">{t.editor.export}</span>
                </Button>
                <Button variant="outline" size="sm" aria-pressed={wrap} onClick={() => setWrap((value) => !value)} title={t.editor.wrap}>
                  <Wrap aria-hidden /> <span className="max-2xl:sr-only">{t.editor.wrap}</span>
                </Button>
              </div>
              <div className="shrink-0">
                <label className="sr-only" htmlFor="example">{t.editor.loadExample}</label>
                <NativeSelect id="example" size="sm" className="w-44" disabled={locked} value="" onChange={loadExample}>
                  <NativeSelectOption value="" disabled>{t.editor.loadExample}</NativeSelectOption>
                  {EXAMPLES.map((example) => (
                    <NativeSelectOption key={example.filename} value={example.filename}>{t.editor.examples[example.filename] ?? example.name}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <PlaybackBar simulation={simulation} showFirstIssue={showFirstIssue} />
            </div>
            <div className="min-h-0 flex-1">
              <CodeEditor
                value={code}
                onChange={setCode}
                onCursor={(line, column) => setCursor({ line, column })}
                editorRef={editor}
                wrap={wrap}
                readOnly={locked}
                activeLine={activeLine}
                label={t.editor.sourceLabel}
              />
            </div>
            <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="whitespace-nowrap">{t.editor.cursor(cursor.line, cursor.column)}</span>
              <span className="whitespace-nowrap">{t.editor.lineCount(lineCount)}</span>
              {locked && (
                <span className="flex items-center gap-1 text-foreground">
                  <Lock size={12} aria-hidden /> {t.editor.locked}
                </span>
              )}
              <span className={`ml-auto flex shrink-0 items-center gap-1.5 ${issues.length ? "text-brick-text" : ""}`}>
                {issues.length ? <Alert size={13} aria-hidden /> : <Check size={13} aria-hidden />}
                {issues.length ? t.editor.problemCount(issues.length) : t.editor.noSyntaxErrors}
              </span>
            </footer>
          </Card>

          <div className="grid shrink-0 gap-3 md:h-56 md:grid-cols-2">
            <Card role="region" aria-labelledby="problems" className="min-h-0 gap-0 overflow-y-auto p-3">
              <h2 id="problems" className="panel-title mb-2 flex items-center gap-2">
                {t.editor.problems}
                {issues.length > 0 && <Badge variant="destructive" className="font-mono tracking-normal">{issues.length}</Badge>}
              </h2>
              {issues.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check size={14} aria-hidden /> <span className="font-read">{t.editor.nothingToFix}</span>
                </p>
              ) : (
                <ul className="space-y-1">
                  {issues.map((issue, index) => (
                    <li key={index} className="rounded border border-transparent px-2 py-1.5 hover:border-border hover:bg-accent/40">
                      <button
                        className="w-full text-left text-sm"
                        onClick={() => editor.current?.focusLine(issue.line, issue.column)}
                      >
                        <span className="mr-2 font-mono text-xs text-brick-text">Ln {issue.line}:{issue.column}</span>
                        <Badge variant="destructive" className="mr-2 h-4 px-1 font-mono text-[10px]">{issue.code}</Badge>
                        <span className="font-read">{issue.message}</span>
                      </button>
                      {issue.hint && <p className="mt-1 whitespace-pre-line pl-1 font-read text-[13px] text-muted-foreground"><span className="text-foreground">{t.editor.hint}</span> {issue.hint}</p>}
                      {issue.related?.map((item) => (
                        <button key={item.line + item.message} className="block pl-1 text-xs underline underline-offset-4" onClick={() => editor.current?.focusLine(item.line)}>
                          {t.editor.relatedLine(item.line)} {item.message}
                        </button>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
              <details className="mt-3 border-t border-border pt-2">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">{t.editor.reference}</summary>
                <dl className="mt-2 space-y-1.5 text-sm">
                  {REFERENCE.map(([syntax, key]) => (
                    <div key={syntax}>
                      <dt className="font-mono text-xs text-foreground">{syntax}</dt>
                      <dd className="font-read text-muted-foreground">{t.editor.referenceItems[key]}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 font-read text-[13px] text-muted-foreground">{t.editor.referenceNote}</p>
              </details>
            </Card>
            <RunConsole snapshot={snapshot} />
          </div>
        </div>

        <aside className="min-w-0 lg:min-h-0" aria-label={t.sim.region}>
          <Simulator simulation={simulation} onJump={(line, column) => editor.current?.focusLine(line, column)} />
        </aside>
      </main>
    </div>
  );
}
