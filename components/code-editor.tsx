"use client";

// A CodeMirror és a React állapotának összekötése.

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState, Compartment, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, keymap, type DecorationSet } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { StreamLanguage, HighlightStyle, syntaxHighlighting, indentUnit, indentService } from "@codemirror/language";
import { linter, lintGutter, forceLinting, type Diagnostic } from "@codemirror/lint";
import { tags } from "@lezer/highlight";
import { KEYWORDS, validateMineScript } from "@/lib/minescript";

const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/\d+/)) return "number";
    if (stream.match(/(?:<>|<=|>=|[+*=<>-])/)) return "operator";
    const word = stream.match(/[a-zA-Z][a-zA-Z0-9]*/);
    if (Array.isArray(word)) {
      const value = word[0];
      if (["true", "false"].includes(value)) return "bool";
      if (value === "isThere") return "variableName.special";
      if (KEYWORDS.includes(value)) return "keyword";
      return "variableName";
    }
    stream.next();
    return "invalid";
  },
});
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#8656bd" },
  { tag: tags.bool, color: "#a66021" },
  { tag: tags.number, color: "#a66021" },
  { tag: tags.operator, color: "#65738a" },
  { tag: tags.variableName, color: "#34445b" },
  { tag: tags.special(tags.variableName), color: "#247d88" },
]);
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "#ffffff", color: "#34445b" },
  ".cm-scroller": { fontFamily: "var(--font-geist-mono), monospace", lineHeight: "1.95", overflow: "auto" },
  ".cm-content": { padding: "22px 0", minHeight: "100%", caretColor: "#4868d9" },
  ".cm-line": { padding: "0 24px 0 10px" },
  ".cm-gutters": { backgroundColor: "#ffffff", border: "none", color: "#9aa4b3", padding: "22px 0 0 12px" },
  ".cm-lineNumbers .cm-gutterElement": { minWidth: "34px", paddingRight: "16px" },
  ".cm-activeLine": { backgroundColor: "#f2f5fc" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#4666ce" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#dce5ff" },
  "&.cm-focused": { outline: "none" },
  ".cm-foldGutter": { width: "12px" },
  ".cm-tooltip": { border: "1px solid #dfe4ec", borderRadius: "6px", backgroundColor: "#fff" },
  ".cm-run-line": { backgroundColor: "#fff1c9", boxShadow: "inset 3px 0 0 #d99a1d" },
  ".cm-error-line": { backgroundColor: "#fde8e8", boxShadow: "inset 3px 0 0 #c84848" },
  ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy #c84848", textUnderlineOffset: "4px" },
  ".cm-error-span": { textDecoration: "underline wavy #c84848", textUnderlineOffset: "4px", backgroundColor: "#f9d0d0", borderRadius: "2px" },
  ".cm-diagnostic": { whiteSpace: "pre-line", maxWidth: "420px" },
  ".cm-diagnosticSource": { fontFamily: "var(--font-geist-mono), monospace", opacity: "0.7" },
});

/** A kiemelt sor; futásidejű hibánál az oszloptartomány a hibás részt is megjelöli. */
export type ActiveLine = { line: number; tone: "run" | "error"; column?: number; endColumn?: number } | null;

const setActiveLine = StateEffect.define<ActiveLine>();
const activeLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setActiveLine)) continue;
      const target = effect.value;
      if (!target || target.line > transaction.state.doc.lines) {
        decorations = Decoration.none;
        continue;
      }

      const line = transaction.state.doc.line(target.line);
      const className = target.tone === "error" ? "cm-error-line" : "cm-run-line";
      const ranges = [Decoration.line({ class: className }).range(line.from)];
      if (target.tone === "error" && target.column && target.endColumn) {
        const from = Math.min(line.to, line.from + target.column - 1);
        const to = Math.min(line.to, line.from + target.endColumn - 1);
        if (to > from) ranges.push(Decoration.mark({ class: "cm-error-span" }).range(from, to));
      }
      decorations = Decoration.set(ranges);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function completeKeywords(context: CompletionContext) {
  const word = context.matchBefore(/[a-zA-Z]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  return {
    from: word.from,
    options: KEYWORDS.map((label) => ({ label, type: "keyword" })),
  };
}

function lintMineScript(editor: EditorView): Diagnostic[] {
  return validateMineScript(editor.state.doc.toString()).map((issue) => {
    const line = editor.state.doc.line(issue.line);
    const from = Math.min(line.to, line.from + issue.column - 1);
    // Üres sornál nincs mit aláhúzni, ilyenkor a sor elejére tesszük a jelölést.
    const to = Math.max(from, Math.min(line.to, line.from + issue.endColumn - 1));
    const related = issue.related?.map((item) => `Line ${item.line}: ${item.message}`).join("\n");
    return {
      from,
      to,
      severity: "error",
      source: issue.code,
      message: [issue.message, issue.hint, related].filter(Boolean).join("\n"),
    };
  });
}

export type EditorHandle = { focusLine: (line: number, column?: number) => void; check: () => void };
type Props = {
  value: string;
  onChange: (value: string) => void;
  onCursor: (line: number, column: number) => void;
  editorRef: React.RefObject<EditorHandle | null>;
  wrap: boolean;
  readOnly?: boolean;
  activeLine?: ActiveLine;
};

export default function CodeEditor({ value, onChange, onCursor, editorRef, wrap, readOnly = false, activeLine = null }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const initialValue = useRef(value);
  const view = useRef<EditorView | null>(null);
  // A szerkesztőt nem építjük újra minden rendernél, de a callbackekből mindig a friss kell.
  const callbacks = useRef({ onChange, onCursor });
  const wrapCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  useEffect(() => {
    callbacks.current = { onChange, onCursor };
  }, [onChange, onCursor]);

  useEffect(() => {
    if (!container.current) return;
    const instance = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          basicSetup, language, syntaxHighlighting(highlight), theme,
          indentUnit.of("  "), keymap.of([indentWithTab]),
          indentService.of((context, pos) => {
            const line = context.state.doc.lineAt(pos);
            const indent = line.text.match(/^ */)![0].length;
            return indent + (/^\s*(if |while |else$)/.test(line.text) ? 2 : 0);
          }),
          autocompletion({ override: [completeKeywords] }),
          lintGutter(),
          linter(lintMineScript, { delay: 350 }),
          wrapCompartment.current.of([]),
          readOnlyCompartment.current.of(EditorState.readOnly.of(false)),
          activeLineField,
          EditorView.contentAttributes.of({ "aria-label": "MineScript source code", spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) {
              const position = update.state.selection.main.head;
              const line = update.state.doc.lineAt(position);
              callbacks.current.onCursor(line.number, position - line.from + 1);
            }
          }),
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

  const highlightedLine = activeLine?.line ?? null;
  const highlightTone = activeLine?.tone;
  const highlightColumn = activeLine?.column;
  const highlightEnd = activeLine?.endColumn;

  useEffect(() => {
    const instance = view.current;
    if (!instance) return;

    const target = highlightedLine !== null && highlightTone
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
