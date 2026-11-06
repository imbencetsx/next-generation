"use client";

// A kódszerkesztő, a fájlkezelés és a szimulátor közös felülete.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertCircle, BookOpen, CheckCircle2, Download, FileCode2, FilePlus2, Lock, Upload, WrapText } from "lucide-react";
import UserMenu from "@/components/auth/user-menu";
import LanguageSwitch from "@/components/language-switch";
import Logo from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import CodeEditor, { type ActiveLine, type EditorHandle } from "@/components/code-editor";
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
          {/* Telefonon: logó és fiók az első sorban, a fájlműveletek alatta teljes szélességben. */}
          <div className="order-3 flex w-full flex-wrap items-center gap-1.5 sm:order-2 sm:ml-auto sm:w-auto">
            <label className="sr-only" htmlFor="example">{t.editor.loadExample}</label>
            <NativeSelect id="example" disabled={locked} value="" onChange={loadExample}>
              <NativeSelectOption value="" disabled>{t.editor.loadExample}</NativeSelectOption>
              {EXAMPLES.map((example) => (
                <NativeSelectOption key={example.filename} value={example.filename}>{t.editor.examples[example.filename] ?? example.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            <Button variant="ghost" disabled={locked} onClick={newFile}>
              <FilePlus2 aria-hidden /> <span className="max-sm:sr-only">{t.editor.new}</span>
            </Button>
            <Button variant="ghost" disabled={locked} onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden /> <span className="max-sm:sr-only">{t.editor.import}</span>
            </Button>
            <input ref={fileInput} type="file" accept=".mine,.txt,text/plain" hidden onChange={(event) => importFile(event.target.files?.[0])} />
            <Button variant="ghost" onClick={exportFile}>
              <Download aria-hidden /> <span className="max-sm:sr-only">{t.editor.export}</span>
            </Button>
            <Link className={buttonVariants({ variant: "ghost" })} data-slot="button" data-variant="ghost" href="/docs">
              <BookOpen aria-hidden /> <span className="max-sm:sr-only">{t.editor.docs}</span>
            </Link>
          </div>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
            <LanguageSwitch />
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-2 lg:overflow-hidden">
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <Card role="region" aria-label={t.editor.region} className="min-h-[320px] min-w-0 flex-1 gap-0 py-0">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
                <FileCode2 size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{filename}</span>
              </span>
              <span
                className={`ml-auto flex shrink-0 items-center gap-1.5 text-xs ${issues.length ? "text-brick-text" : "text-muted-foreground"}`}
              >
                {issues.length ? <AlertCircle size={14} aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
                {issues.length ? t.editor.problemCount(issues.length) : t.editor.noSyntaxErrors}
              </span>
              <Button variant="outline" size="sm" aria-pressed={wrap} onClick={() => setWrap((value) => !value)}>
                <WrapText aria-hidden /> {t.editor.wrap}
              </Button>
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
                <span className="ml-auto flex items-center gap-1 text-foreground">
                  <Lock size={12} aria-hidden /> {t.editor.locked}
                </span>
              )}
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
                  <CheckCircle2 size={14} aria-hidden /> <span className="font-read">{t.editor.nothingToFix}</span>
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
          <Simulator simulation={simulation} firstIssue={issues[0] ?? null} onJump={(line, column) => editor.current?.focusLine(line, column)} />
        </aside>
      </main>
    </div>
  );
}
