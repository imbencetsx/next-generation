"use client";

// A kódszerkesztő, a fájlkezelés és a szimulátor közös felülete.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertCircle, BookOpen, CheckCircle2, Download, FilePlus2, Upload, WrapText } from "lucide-react";
import CodeEditor, { type ActiveLine, type EditorHandle } from "@/components/code-editor";
import Simulator from "@/components/simulator";
import { useSimulation } from "@/components/use-simulation";
import { EXAMPLES, validateMineScript } from "@/lib/minescript";

const REFERENCE = [
  ["set <name> to <expr>", "Assign a value, isThere <v>, not <v>, or <v> <op> <v>"],
  ["step forward <v>", "Move the robot forward"],
  ["turn by <v>", "Rotate the robot"],
  ["mine here", "Mine the current cell"],
  ["print <v>", "Output a value"],
  ["if <v>  /  else", "Conditional block (indent 2 spaces)"],
  ["while <v>", "Loop block (indent 2 spaces)"],
] as const;

export default function Workbench() {
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
      ? { line: snapshot.line, tone: snapshot.status === "error" ? "error" : "run" }
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
    <div className="flex h-dvh flex-col bg-[#f6f7fb] text-[#34445b]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#dfe4ec] bg-white px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight">MineScript Editor</h1>
        <span className="rounded bg-[#eef1fb] px-2 py-0.5 font-mono text-xs text-[#4666ce]">{filename}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="example">Load example</label>
          <select
            id="example"
            className="btn"
            disabled={locked}
            value=""
            onChange={loadExample}
          >
            <option value="" disabled>Load example…</option>
            {EXAMPLES.map((example) => (
              <option key={example.filename} value={example.filename}>{example.name}</option>
            ))}
          </select>
          <button className="btn" disabled={locked} onClick={newFile}>
            <FilePlus2 size={16} aria-hidden /> New
          </button>
          <button className="btn" disabled={locked} onClick={() => fileInput.current?.click()}>
            <Upload size={16} aria-hidden /> Import
          </button>
          <input ref={fileInput} type="file" accept=".mine,.txt,text/plain" hidden onChange={(event) => importFile(event.target.files?.[0])} />
          <button className="btn" onClick={exportFile}>
            <Download size={16} aria-hidden /> Export
          </button>
          <Link className="btn" href="/docs">
            <BookOpen size={16} aria-hidden /> Docs
          </Link>
          <button className="btn" aria-pressed={wrap} onClick={() => setWrap((value) => !value)}>
            <WrapText size={16} aria-hidden /> Wrap
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <section className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#dfe4ec] bg-white">
            <div className="min-h-0 flex-1">
              <CodeEditor
                value={code}
                onChange={setCode}
                onCursor={(line, column) => setCursor({ line, column })}
                editorRef={editor}
                wrap={wrap}
                readOnly={locked}
                activeLine={activeLine}
              />
            </div>
            <footer className="flex items-center gap-4 border-t border-[#dfe4ec] px-4 py-1.5 font-mono text-xs text-[#65738a]">
              <span>Ln {cursor.line}, Col {cursor.column}</span>
              <span>{lineCount} lines</span>
              {locked && <span className="text-[#a66021]">Editing is locked while a run is in progress. Reset to edit.</span>}
              <span className={`ml-auto flex items-center gap-1 ${issues.length ? "text-[#c84848]" : "text-[#2f8f5b]"}`}>
                {issues.length ? <AlertCircle size={14} aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
                {issues.length ? `${issues.length} problem${issues.length > 1 ? "s" : ""}` : "No syntax errors"}
              </span>
            </footer>
          </section>

          <section className="max-h-52 shrink-0 overflow-y-auto rounded-lg border border-[#dfe4ec] bg-white p-3" aria-labelledby="problems">
            <h2 id="problems" className="mb-1 text-sm font-semibold">Problems</h2>
            {issues.length === 0 ? (
              <p className="text-sm text-[#65738a]">Nothing to fix. The program is syntactically valid.</p>
            ) : (
              <ul className="space-y-0.5">
                {issues.map((issue, index) => (
                  <li key={index}>
                    <button
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-[#f2f5fc] focus-visible:outline-2 focus-visible:outline-[#4868d9]"
                      onClick={() => editor.current?.focusLine(issue.line)}
                    >
                      <span className="mr-2 font-mono text-xs text-[#c84848]">Ln {issue.line}:{issue.column}</span>
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-2 border-t border-[#eef1f6] pt-2">
              <summary className="cursor-pointer text-sm font-semibold">Language reference</summary>
              <dl className="mt-2 space-y-1.5 text-sm">
                {REFERENCE.map(([syntax, description]) => (
                  <div key={syntax}>
                    <dt className="font-mono text-xs text-[#8656bd]">{syntax}</dt>
                    <dd className="text-[#65738a]">{description}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-[#65738a]">
                Values are variables, <code>true</code>/<code>false</code>, or integers 0–100. Operators: + - * = &lt;&gt; &lt; &lt;= &gt; &gt;= and or.
                isThere: 0 empty, 1 wall, 2 gold. turn by turns left.
              </p>
            </details>
          </section>
        </div>

        <aside className="min-h-0 min-w-0 lg:overflow-y-auto" aria-label="Simulator">
          <Simulator simulation={simulation} firstIssueLine={issues[0]?.line ?? null} onJump={(line) => editor.current?.focusLine(line)} />
        </aside>
      </main>
    </div>
  );
}
