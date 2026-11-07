"use client";

// A CodeMirror szerkesztő React-burka. A szerkesztőpéldány egyszer jön létre; a React-tulajdonságok
// változásait (szöveg, sortörés, írásvédelem, kiemelt sor) tranzakciókkal adjuk át neki.

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { indentLess } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { lintGutter, forceLinting } from "@codemirror/lint";
import { Compartment, EditorState, type StateEffect } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { activeLineField, setActiveLine, type ActiveLine } from "./active-line";
import { completeOrIndent, INDENT, minescriptSupport } from "./minescript-mode";
import { editorTheme } from "./theme";

export type { ActiveLine } from "./active-line";

/** A szülő ezen keresztül vezérli a szerkesztőt (pl. egy hibára ugrás). */
export type EditorHandle = { focusLine: (line: number, column?: number) => void; check: () => void };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onCursor: (line: number, column: number) => void;
  editorRef: React.RefObject<EditorHandle | null>;
  wrap: boolean;
  readOnly?: boolean;
  activeLine?: ActiveLine;
  /** A szerkesztőterület akadálymentes neve (a felület nyelvén). */
  label: string;
};

export default function CodeEditor({
  value,
  onChange,
  onCursor,
  editorRef,
  wrap,
  readOnly = false,
  activeLine = null,
  label,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const initialValue = useRef(value);
  // A szerkesztőt nem építjük újra minden rendernél, de a callbackekből mindig a friss kell.
  const callbacks = useRef({ onChange, onCursor });
  const wrapCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());

  useEffect(() => {
    callbacks.current = { onChange, onCursor };
  }, [onChange, onCursor]);

  // A szerkesztő létrehozása (egyszer).
  useEffect(() => {
    if (!container.current) return;

    const reportChanges = EditorView.updateListener.of((update) => {
      if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
      if (update.selectionSet || update.docChanged) {
        const position = update.state.selection.main.head;
        const line = update.state.doc.lineAt(position);
        callbacks.current.onCursor(line.number, position - line.from + 1);
      }
    });

    const instance = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          basicSetup,
          minescriptSupport,
          editorTheme,
          indentUnit.of(INDENT),
          keymap.of([{ key: "Tab", run: completeOrIndent, shift: indentLess }]),
          lintGutter(),
          wrapCompartment.current.of([]),
          readOnlyCompartment.current.of(EditorState.readOnly.of(false)),
          activeLineField,
          EditorView.contentAttributes.of({ spellcheck: "false" }),
          reportChanges,
        ],
      }),
    });

    view.current = instance;
    editorRef.current = {
      focusLine(number, column = 1) {
        const line = instance.state.doc.line(Math.max(1, Math.min(number, instance.state.doc.lines)));
        const anchor = Math.min(line.to, line.from + column - 1);
        instance.dispatch({ selection: { anchor }, scrollIntoView: true });
        instance.focus();
      },
      check() {
        forceLinting(instance);
      },
    };

    return () => {
      instance.destroy();
      view.current = null;
      editorRef.current = null;
    };
  }, [editorRef]);

  // Kívülről érkező szöveg (példa betöltése, import); a saját gépelésünk már egyezik, azt nem írjuk vissza.
  useEffect(() => {
    const instance = view.current;
    if (instance && value !== instance.state.doc.toString()) {
      instance.dispatch({ changes: { from: 0, to: instance.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: wrapCompartment.current.reconfigure(wrap ? EditorView.lineWrapping : []),
    });
  }, [wrap]);

  useEffect(() => {
    view.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  useEffect(() => {
    view.current?.contentDOM.setAttribute("aria-label", label);
  }, [label]);

  // Mezőnként figyeljük, hogy egy új (de azonos tartalmú) objektum ne váltson ki újabb görgetést.
  const highlightedLine = activeLine?.line ?? null;
  const highlightTone = activeLine?.tone;
  const highlightColumn = activeLine?.column;
  const highlightEnd = activeLine?.endColumn;

  useEffect(() => {
    const instance = view.current;
    if (!instance) return;

    const target =
      highlightedLine !== null && highlightTone
        ? { line: highlightedLine, tone: highlightTone, column: highlightColumn, endColumn: highlightEnd }
        : null;
    const effects: StateEffect<unknown>[] = [setActiveLine.of(target)];
    if (target && target.line <= instance.state.doc.lines) {
      const line = instance.state.doc.line(target.line);
      effects.push(EditorView.scrollIntoView(line.from, { y: "nearest" }));
    }
    instance.dispatch({ effects });
  }, [highlightedLine, highlightTone, highlightColumn, highlightEnd]);

  return <div className="code-editor" ref={container} />;
}
