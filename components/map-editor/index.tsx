"use client";

// A térképszerkesztő oldal (/map-editor). Bal oldalon a térképfájl szövege CodeMirrorban, fájlműveletekkel és
// hibalistával; jobb oldalon ugyanaz a térkép rajzolva, ecsetekkel. A két nézet ugyanazt a szöveget szerkeszti.
// A „Használat a szimulátorban” a térképet (és a magával hozott programot) visszaviszi a munkafelületre,
// a „Közzététel” pedig minden játékosnak megosztja (publish-map.tsx). Kis képernyőn a három rész fülekre bomlik
// (Rajz, Szöveg, Hibák); a rajz az alapértelmezett, mert érintéssel az a kényelmesebb.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import CodeEditor, { type EditorHandle } from "@/components/code-editor";
import { Alert, Brush, Check, Notes } from "@/components/icons";
import Logo from "@/components/logo";
import MobileTabs, { TabPanel, type MobileTab } from "@/components/mobile-tabs";
import { COMPACT_QUERY, useMediaQuery } from "@/components/use-media-query";
import TopBar, { AccountActions } from "@/components/top-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";
import { formatMap, paintCell, type MapTool } from "@/lib/map-editor";
import { ROUTES } from "@/lib/routes";
import FileToolbar from "./file-toolbar";
import MapControls from "./map-controls";
import MapGrid from "./map-grid";
import PublishMap from "./publish-map";
import { useMapDocument, type FileError } from "./use-map-document";
import { localizedMapError } from "@/i18n/map-errors";
import type { Locale } from "@/i18n/locale";
import type { Messages } from "@/i18n/messages";

/** Az import hibája a felület nyelvén; érvénytelen térképnél a térképolvasó (angol, pontos) üzenete. */
function fileErrorMessage(error: FileError, labels: Messages["mapEditor"], locale: Locale): string {
  if (error.kind === "invalid") return localizedMapError(error.message, locale);
  return error.kind === "read" ? labels.fileRead : labels.fileLarge;
}

type Tab = "draw" | "text" | "problems";
const TABS_ID = "map-editor";

export default function MapEditor() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const file = useMapDocument(params.get("map"), params.get("mapName"), params.get("draft") ?? "");
  const { preview, validation, source } = file.document;
  const editor = useRef<EditorHandle | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [tool, setTool] = useState<MapTool>("wall");
  const [notice, setNotice] = useState(false);
  const compact = useMediaQuery(COMPACT_QUERY);
  const [tab, setTab] = useState<Tab>("draw");
  const returnQuery = Object.fromEntries(
    ["code", "filename", "map", "mapName"].flatMap((key) =>
      params.get(key) !== null ? [[key, params.get(key)!]] : [],
    ),
  );

  // Kis képernyőn a hibás helyre ugrás előbb a szöveg fülére vált (a rejtett szerkesztő nem tud görgetni).
  function jumpTo(line: number, column: number) {
    if (!compact) return editor.current?.focusLine(line, column);
    setTab("text");
    requestAnimationFrame(() => editor.current?.focusLine(line, column));
  }

  function paint(x: number, y: number) {
    if (!validation.ok) return;
    const next = paintCell(validation.map, x, y, tool);
    setNotice(next === validation.map);
    if (next !== validation.map) file.changeMap(next);
  }

  const sourceCard = (
    <Card className="min-h-[360px] min-w-0 flex-1 gap-0 py-0" role="region" aria-labelledby="map-source-title">
      {/* Látható cím nincs (mint a kódszerkesztőnél); a képernyőolvasónak ez az oldal címe. */}
      <h1 id="map-source-title" className="sr-only">
        {t.mapEditor.title}
      </h1>
      <FileToolbar file={file} />
      <div className="min-h-0 flex-1">
        <CodeEditor
          wrap={false}
          mode="map"
          value={source}
          onChange={file.changeSource}
          onCursor={(line, column) => setCursor({ line, column })}
          editorRef={editor}
          label={t.mapEditor.source}
        />
      </div>
      <footer className="flex flex-wrap items-center gap-4 border-t border-border px-3 py-2 font-mono text-xs text-muted-foreground">
        <span>{t.editor.cursor(cursor.line, cursor.column)}</span>
        <span>{t.editor.lineCount(source.split("\n").length)}</span>
        <span
          role="status"
          className={`ml-auto flex items-center gap-2 ${validation.ok ? "text-foreground" : "text-brick-text"}`}
        >
          {validation.ok ? <Check size={16} /> : <Alert size={16} />}
          {validation.ok ? t.mapEditor.valid : t.mapEditor.invalid}
        </span>
      </footer>
    </Card>
  );
  const problemsCard = (
    <Card className="shrink-0 gap-3 p-3" role="region" aria-label={t.editor.problems}>
      <h2 className="panel-title">{t.editor.problems}</h2>
      {!validation.ok && (
        <div role="alert" className="font-read text-sm text-brick-text">
          <Button
            variant="ghost"
            className="h-auto justify-start px-0"
            onClick={() => jumpTo(validation.line ?? 1, validation.column ?? 1)}
          >
            {t.mapEditor.errorLocation(validation.line ?? 1, validation.column ?? 1)}
          </Button>
          <p>{localizedMapError(validation.error, locale)}</p>
        </div>
      )}
      {file.fileError && (
        <p role="alert" className="font-read text-sm text-brick-text">
          {fileErrorMessage(file.fileError, t.mapEditor, locale)}
        </p>
      )}
      {validation.ok && !file.fileError && (
        <p className="flex items-center gap-2 font-read text-sm text-muted-foreground">
          <Check size={16} />
          {t.mapEditor.valid}
        </p>
      )}
      <p className="font-read text-xs text-muted-foreground">{t.mapEditor.formatHint}</p>
      <p id="map-export-hint" className="font-read text-xs text-muted-foreground">
        {t.mapEditor.exportHint}
      </p>
      <p id="map-publish-hint" className="font-read text-xs text-muted-foreground">
        {t.mapEditor.publishHint}
      </p>
    </Card>
  );
  const visualCard = (
    <Card
      className="min-h-[480px] min-w-0 flex-1 gap-0 py-0 lg:min-h-0"
      role="region"
      aria-labelledby="map-visual-title"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <h2 id="map-visual-title" className="panel-title mr-auto">
          {t.mapEditor.visual}
        </h2>
        <PublishMap name={file.document.name} text={validation.ok ? formatMap(validation.map) : null} />
        {validation.ok ? (
          <Link
            data-slot="button"
            data-variant="default"
            className={buttonVariants()}
            href={{
              pathname: ROUTES.workbench,
              query: { ...returnQuery, map: formatMap(validation.map), mapName: file.document.name },
            }}
          >
            {t.mapEditor.useMap}
          </Link>
        ) : (
          <Button disabled>{t.mapEditor.useMap}</Button>
        )}
      </header>
      <MapControls
        map={preview}
        disabled={!validation.ok}
        tool={tool}
        onTool={(next) => {
          setTool(next);
          setNotice(false);
        }}
        onChange={file.changeMap}
      />
      {!validation.ok && (
        <p role="status" className="border-b border-border p-3 font-read text-sm text-muted-foreground">
          {t.mapEditor.lastValid}
        </p>
      )}
      <MapGrid map={preview} disabled={!validation.ok} onPaint={paint} />
      <footer className="space-y-2 border-t border-border p-3 font-read text-xs text-muted-foreground">
        <p role="status">
          {notice
            ? t.mapEditor.protectedRobot
            : t.mapEditor.statistics(preview.gold.filter(Boolean).length, preview.rows * preview.cols)}
        </p>
        <p id="map-keyboard-hint">{t.mapEditor.keyboardHint}</p>
      </footer>
    </Card>
  );
  const tabs: MobileTab<Tab>[] = [
    { id: "draw", label: t.mobile.draw, icon: Brush },
    { id: "text", label: t.mobile.text, icon: Notes },
    {
      id: "problems",
      label: t.mobile.problems,
      icon: Alert,
      count: (validation.ok ? 0 : 1) + (file.fileError ? 1 : 0),
      alert: true,
    },
  ];

  return (
    <div className="app-ui flex h-dvh flex-col">
      <TopBar
        brand={
          <Link href={ROUTES.home} aria-label={t.home.title}>
            <Logo />
          </Link>
        }
      >
        <AccountActions />
      </TopBar>
      {file.confirmation}
      {compact ? (
        <>
          <main className="flex min-h-0 flex-1 flex-col p-2">
            <TabPanel idPrefix={TABS_ID} id="draw" active={tab === "draw"} className="overflow-y-auto">
              {visualCard}
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="text" active={tab === "text"}>
              {sourceCard}
            </TabPanel>
            <TabPanel idPrefix={TABS_ID} id="problems" active={tab === "problems"} className="overflow-y-auto">
              {problemsCard}
            </TabPanel>
          </main>
          <nav className="mobile-dock" aria-label={t.mobile.mapEditorViews}>
            <MobileTabs tabs={tabs} active={tab} onChange={setTab} label={t.mobile.mapEditorViews} idPrefix={TABS_ID} />
          </nav>
        </>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-3">
          <section className="flex min-h-0 min-w-0 flex-col gap-3">
            {sourceCard}
            {problemsCard}
          </section>
          {visualCard}
        </main>
      )}
    </div>
  );
}
