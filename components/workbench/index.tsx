"use client";

// A fő munkafelület: bal oldalon a kódszerkesztő (fájlműveletek, futásvezérlés, hibák, konzol),
// jobb oldalon a térkép. Kis képernyőn (COMPACT_QUERY) ugyanezek fülekre bomlanak (Kód, Térkép, Konzol, Hibák), a
// futás vezérlői a fülsor fölé kerülnek, és indításkor a térkép fülére váltunk. Az állapot két hookban él: a program
// (useProgramFile) és a futás (useSimulation).

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import CodeEditor, { type ActiveLine, type EditorHandle } from "@/components/code-editor";
import { Alert, Check, Code, Lock, MapIcon, Terminal } from "@/components/icons";
import Logo from "@/components/logo";
import MobileTabs, { TabPanel, type MobileTab } from "@/components/mobile-tabs";
import PlaybackBar from "@/components/playback-bar";
import RunConsole from "@/components/run-console";
import Simulator from "@/components/simulator";
import TopBar, { AccountActions } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { COMPACT_QUERY, useMediaQuery } from "@/components/use-media-query";
import { useSimulation } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import type { Snapshot } from "@/lib/interpreter";
import { validateMineScript, type SyntaxIssue } from "@/lib/minescript";
import FileToolbar from "./file-toolbar";
import ProblemsPanel from "./problems-panel";
import PublishedMapResult from "./published-map-result";
import { useResultRecorder } from "./use-result-recorder";
import { useProgramFile } from "./use-program-file";
import { ROUTES } from "@/lib/routes";

type Tab = "code" | "map" | "console" | "problems";
const TABS_ID = "workbench";

/** A szerkesztőben kiemelendő sor: futás közben az aktuális sor, hibánál a hibás rész. */
function activeLineFor(snapshot: Snapshot): ActiveLine {
  if (!snapshot.line) return null;
  if (snapshot.status === "error" && snapshot.error) {
    const { line, column, endColumn } = snapshot.error;
    return { line, tone: "error", column, endColumn };
  }
  if (snapshot.status === "running") return { line: snapshot.line, tone: "run" };
  return null;
}

export default function Workbench() {
  const { t } = useI18n();
  // A dokumentáció „Megnyitás a szerkesztőben” linkje ezekben küldi a példát.
  const params = useSearchParams();
  const file = useProgramFile(
    params.get("code"),
    params.get("filename"),
    params.get("draft") ?? params.get("mapId") ?? params.get("map") ?? "",
  );
  // Közzétett térképen (a kezdőlapról, ?mapId=) minden végigért futás eredménye rögzül.
  const recorder = useResultRecorder();
  const simulation = useSimulation(file.code, {
    mapText: params.get("map"),
    mapName: params.get("mapName"),
    mapId: params.get("mapId"),
    onRunEnd: ({ code, mapId }) => {
      if (mapId) void recorder.recordRun(mapId, code);
    },
  });
  const { snapshot, locked } = simulation;

  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const compact = useMediaQuery(COMPACT_QUERY);
  const [tab, setTab] = useState<Tab>("code");
  const editor = useRef<EditorHandle | null>(null);
  const issues = useMemo(() => validateMineScript(file.code), [file.code]);
  const lineCount = useMemo(() => file.code.split("\n").length, [file.code]);

  // Kis képernyőn a szerkesztő fülére váltunk, és csak utána ugrunk (a rejtett szerkesztő nem tud görgetni).
  function jumpTo(line: number, column?: number) {
    if (!compact) return editor.current?.focusLine(line, column);
    setTab("code");
    requestAnimationFrame(() => editor.current?.focusLine(line, column));
  }

  // Hibás programnál a futtatás nem indul el; ilyenkor az első hibára ugrunk, hogy látszódjon, mit kell javítani.
  function showFirstIssue() {
    if (issues[0]) jumpTo(issues[0].line, issues[0].column);
  }

  // Kis képernyőn indításkor a térképre váltunk, hogy látsszon a robot (hibás programnál a kód marad elöl).
  function onStart() {
    if (compact && issues.length === 0) setTab("map");
  }

  function changeCode(next: string) {
    if (next === file.code) return;
    file.setCode(next);
    if (simulation.started && !simulation.locked) simulation.reset();
  }

  function newFile() {
    file.newFile(simulation.reset);
  }

  const playback = (
    <PlaybackBar simulation={simulation} showFirstIssue={showFirstIssue} onStart={onStart} compact={compact} />
  );

  const editorCard = (
    <Card role="region" aria-label={t.editor.region} className="min-h-[320px] min-w-0 flex-1 gap-0 py-0">
      {/* A program és a futtatása egy helyen: fent a fájl, alatta a futás vezérlői (kis képernyőn a fülsor fölött). */}
      <div className="flex flex-col gap-2 border-b border-border px-2 py-2">
        <FileToolbar
          name={file.name}
          onRename={file.rename}
          locked={locked}
          onNew={newFile}
          onImport={(nextFile) => file.importFile(nextFile, simulation.reset)}
          onExport={file.exportFile}
          onLoadExample={(filename) => file.loadExample(filename, simulation.reset)}
        />
        {!compact && playback}
      </div>

      <div className="min-h-0 flex-1">
        <CodeEditor
          wrap={false}
          value={file.code}
          onChange={changeCode}
          onCursor={(line, column) => setCursor({ line, column })}
          editorRef={editor}
          readOnly={locked}
          activeLine={activeLineFor(snapshot)}
          label={t.editor.sourceLabel}
        />
      </div>

      <EditorStatusBar cursor={cursor} lineCount={lineCount} locked={locked} issues={issues} />
    </Card>
  );
  const problems = <ProblemsPanel issues={issues} runtimeError={snapshot.error} onJump={jumpTo} />;
  const runConsole = <RunConsole snapshot={snapshot} />;
  const simulator = (
    <Simulator
      simulation={simulation}
      footer={
        simulation.publishedMapId && <PublishedMapResult mapId={simulation.publishedMapId} record={recorder.state} />
      }
    />
  );

  const tabs: MobileTab<Tab>[] = [
    { id: "code", label: t.mobile.code, icon: Code },
    { id: "map", label: t.mobile.map, icon: MapIcon },
    { id: "console", label: t.mobile.console, icon: Terminal, count: snapshot.output.length },
    {
      id: "problems",
      label: t.mobile.problems,
      icon: Alert,
      count: issues.length + (snapshot.error ? 1 : 0),
      alert: true,
    },
  ];

  return (
    <div className="app-ui flex h-dvh flex-col">
      <TopBar
        brand={
          <h1 className="flex">
            <Link href={ROUTES.home} aria-label={t.home.title}>
              <Logo />
            </Link>
          </h1>
        }
      >
        <AccountActions />
      </TopBar>

      {file.confirmation}
      {compact ? (
        <>
          <main className="flex min-h-0 flex-1 flex-col p-2">
            <TabPanel idPrefix={TABS_ID} id="code" active={tab === "code"}>
              {editorCard}
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="map" active={tab === "map"}>
              <div className="min-h-0 flex-1">{simulator}</div>
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="console" active={tab === "console"} className="[&>*]:flex-1">
              {runConsole}
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="problems" active={tab === "problems"} className="overflow-y-auto">
              {problems}
            </TabPanel>
          </main>
          <nav className="mobile-dock" aria-label={t.mobile.workbenchViews}>
            {playback}
            <MobileTabs tabs={tabs} active={tab} onChange={setTab} label={t.mobile.workbenchViews} idPrefix={TABS_ID} />
          </nav>
        </>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            {editorCard}
            <div className="grid h-56 shrink-0 grid-cols-2 gap-3">
              {problems}
              {runConsole}
            </div>
          </div>

          <aside className="min-h-0 min-w-0" aria-label={t.sim.region}>
            {simulator}
          </aside>
        </main>
      )}
    </div>
  );
}

type StatusBarProps = {
  cursor: { line: number; column: number };
  lineCount: number;
  locked: boolean;
  issues: SyntaxIssue[];
};

/** A szerkesztő alsó sora: kurzorpozíció, sorok száma, zárolás és a szintaktikai állapot. */
function EditorStatusBar({ cursor, lineCount, locked, issues }: StatusBarProps) {
  const { t } = useI18n();
  const hasIssues = issues.length > 0;
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
      <span className="whitespace-nowrap">{t.editor.cursor(cursor.line, cursor.column)}</span>
      <span className="whitespace-nowrap">{t.editor.lineCount(lineCount)}</span>
      {locked && (
        <span className="flex items-center gap-1 text-foreground">
          <Lock size={12} aria-hidden /> {t.editor.locked}
        </span>
      )}
      <span className={`ml-auto flex shrink-0 items-center gap-1.5 ${hasIssues ? "text-brick-text" : ""}`}>
        {hasIssues ? <Alert size={13} aria-hidden /> : <Check size={13} aria-hidden />}
        {hasIssues ? t.editor.problemCount(issues.length) : t.editor.noSyntaxErrors}
      </span>
    </footer>
  );
}
