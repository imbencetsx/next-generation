"use client";

// A térképszerkesztő oldal (/map-editor). Bal oldalon a térképfájl szövege CodeMirrorban, fájlműveletekkel és
// hibalistával; jobb oldalon ugyanaz a térkép rajzolva, ecsetekkel. A két nézet ugyanazt a szöveget szerkeszti.
// A „Használat a szimulátorban” a térképet (és a magával hozott programot) visszaviszi a munkafelületre.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import CodeEditor, { type EditorHandle } from "@/components/code-editor";
import { Alert, Book, Check, Code } from "@/components/icons";
import Logo from "@/components/logo";
import TopBar, { AccountActions } from "@/components/top-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";
import { formatMap, paintCell, type MapTool } from "@/lib/map-editor";
import { ROUTES } from "@/lib/routes";
import FileToolbar from "./file-toolbar";
import MapControls from "./map-controls";
import MapGrid from "./map-grid";
import { useMapDocument, type FileError } from "./use-map-document";
import type { Messages } from "@/i18n/messages";

/** Az import hibája a felület nyelvén; érvénytelen térképnél a térképolvasó (angol, pontos) üzenete. */
function fileErrorMessage(error: FileError, labels: Messages["mapEditor"]): string {
  if (error.kind === "invalid") return error.message;
  return error.kind === "read" ? labels.fileRead : labels.fileLarge;
}

export default function MapEditor() {
  const { t } = useI18n();
  const params = useSearchParams();
  const file = useMapDocument(params.get("map"));
  const { preview, validation, source } = file.document;
  const editor = useRef<EditorHandle | null>(null);
  const [wrap, setWrap] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [tool, setTool] = useState<MapTool>("wall");
  const [notice, setNotice] = useState(false);
  const returnQuery = Object.fromEntries(
    ["code", "filename", "map"].flatMap((key) => (params.get(key) !== null ? [[key, params.get(key)!]] : [])),
  );

  function paint(x: number, y: number) {
    if (!validation.ok) return;
    const next = paintCell(validation.map, x, y, tool);
    setNotice(next === validation.map);
    if (next !== validation.map) file.changeMap(next);
  }

  return (
    <div className="app-ui flex h-dvh flex-col">
      <TopBar
        brand={
          <Link href={{ pathname: ROUTES.workbench, query: returnQuery }} aria-label={t.mapEditor.workbench}>
            <Logo />
          </Link>
        }
      >
        <Link
          href={{ pathname: ROUTES.workbench, query: returnQuery }}
          data-slot="button"
          data-variant="ghost"
          className={buttonVariants({ variant: "ghost" })}
        >
          <Code />
          <span className="max-sm:sr-only">{t.mapEditor.workbench}</span>
        </Link>
        <Link
          href={ROUTES.docs}
          data-slot="button"
          data-variant="ghost"
          className={buttonVariants({ variant: "ghost" })}
        >
          <Book />
          <span className="max-sm:sr-only">{t.editor.docs}</span>
        </Link>
        <AccountActions />
      </TopBar>
      <main className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <Card className="min-h-[360px] min-w-0 flex-1 gap-0 py-0" role="region" aria-labelledby="map-source-title">
            {/* Látható cím nincs (mint a kódszerkesztőnél); a képernyőolvasónak ez az oldal címe. */}
            <h1 id="map-source-title" className="sr-only">
              {t.mapEditor.title}
            </h1>
            <FileToolbar file={file} wrap={wrap} onWrap={() => setWrap((value) => !value)} />
            <div className="min-h-0 flex-1">
              <CodeEditor
                mode="map"
                value={source}
                onChange={file.changeSource}
                onCursor={(line, column) => setCursor({ line, column })}
                editorRef={editor}
                wrap={wrap}
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
          <Card className="shrink-0 gap-3 p-3" role="region" aria-label={t.editor.problems}>
            <h2 className="panel-title">{t.editor.problems}</h2>
            {!validation.ok && (
              <div role="alert" className="font-read text-sm text-brick-text">
                <Button
                  variant="ghost"
                  className="h-auto justify-start px-0"
                  onClick={() => editor.current?.focusLine(validation.line ?? 1, validation.column ?? 1)}
                >
                  {t.mapEditor.errorLocation(validation.line ?? 1, validation.column ?? 1)}
                </Button>
                <p>{validation.error}</p>
              </div>
            )}
            {file.fileError && (
              <p role="alert" className="font-read text-sm text-brick-text">
                {fileErrorMessage(file.fileError, t.mapEditor)}
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
          </Card>
        </section>
        <Card className="min-h-[480px] min-w-0 gap-0 py-0 lg:min-h-0" role="region" aria-labelledby="map-visual-title">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <h2 id="map-visual-title" className="panel-title">
              {t.mapEditor.visual}
            </h2>
            {validation.ok ? (
              <Link
                data-slot="button"
                data-variant="default"
                className={buttonVariants()}
                href={{ pathname: ROUTES.workbench, query: { ...returnQuery, map: formatMap(validation.map) } }}
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
      </main>
    </div>
  );
}
