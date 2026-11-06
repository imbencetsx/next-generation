"use client";

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState, Compartment, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, keymap, type DecorationSet } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { StreamLanguage, HighlightStyle, syntaxHighlighting, indentUnit, indentService } from "@codemirror/language";
import { linter, lintGutter, forceLinting } from "@codemirror/lint";
import { tags } from "@lezer/highlight";
import { KEYWORDS, validateMineScript } from "@/lib/minescript";

const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/\d+/)) return "number";
    if (stream.match(/(?:<>|<=|>=|[+*=<>-])/)) return "operator";
    const word = stream.match(/[a-zA-Z][a-zA-Z0-9]*/);
    if (word) {
      const value = (word as RegExpMatchArray)[0];
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
});

export type ActiveLine = { line: number; tone: "run" | "error" } | null;

const setActiveLine = StateEffect.define<ActiveLine>();
const activeLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setActiveLine)) continue;
      const target = effect.value;
      decorations = !target || target.line > transaction.state.doc.lines
        ? Decoration.none
        : Decoration.set([
            Decoration.line({ class: target.tone === "error" ? "cm-error-line" : "cm-run-line" })
              .range(transaction.state.doc.line(target.line).from),
          ]);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export type EditorHandle = { focusLine: (line: number) => void; check: () => void };
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
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onCursor });
  const wrapCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  useEffect(() => { callbacks.current = { onChange, onCursor }; }, [onChange, onCursor]);

  useEffect(() => {
    if (!container.current) return;
    const instance = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup, language, syntaxHighlighting(highlight), theme,
          indentUnit.of("  "), keymap.of([indentWithTab]),
          indentService.of((context, pos) => {
            const line = context.state.doc.lineAt(pos);
            const indent = line.text.match(/^ */)![0].length;
            return indent + (/^\s*(if |while |else$)/.test(line.text) ? 2 : 0);
          }),
          autocompletion({ override: [(context) => {
            const word = context.matchBefore(/[a-zA-Z]*/);
            if (!word || (word.from === word.to && !context.explicit)) return null;
            return { from: word.from, options: KEYWORDS.map((label) => ({ label, type: "keyword" })) };
          }] }),
          lintGutter(),
          linter((editor) => validateMineScript(editor.state.doc.toString()).map((issue) => {
            const line = editor.state.doc.line(issue.line);
            return { from: Math.min(line.to, line.from + issue.column - 1), to: line.to, severity: "error" as const, message: issue.message };
          }), { delay: 350 }),
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
      focusLine(number) {
        const line = instance.state.doc.line(Math.min(number, instance.state.doc.lines));
        instance.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
        instance.focus();
      },
      check() { forceLinting(instance); },
    };
    return () => { instance.destroy(); view.current = null; editorRef.current = null; };
    // The editor is created once; external document changes are dispatched below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = view.current;
    if (instance && value !== instance.state.doc.toString()) {
      instance.dispatch({ changes: { from: 0, to: instance.state.doc.length, insert: value } });
    }
  }, [value]);
  useEffect(() => { view.current?.dispatch({ effects: wrapCompartment.current.reconfigure(wrap ? EditorView.lineWrapping : []) }); }, [wrap]);
  useEffect(() => { view.current?.dispatch({ effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)) }); }, [readOnly]);
  const activeKey = activeLine ? `${activeLine.line}:${activeLine.tone}` : "";
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const target = activeKey ? { line: Number(activeKey.split(":")[0]), tone: activeKey.split(":")[1] as "run" | "error" } : null;
    const effects: StateEffect<unknown>[] = [setActiveLine.of(target)];
    if (target && target.line <= instance.state.doc.lines) {
      effects.push(EditorView.scrollIntoView(instance.state.doc.line(target.line).from, { y: "nearest" }));
    }
    instance.dispatch({ effects });
  }, [activeKey]);
  return <div className="code-editor" ref={container} />;
}
