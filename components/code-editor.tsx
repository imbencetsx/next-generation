"use client";

// A CodeMirror és a React állapotának összekötése.

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState, EditorSelection, Compartment, StateEffect, StateField, countColumn } from "@codemirror/state";
import { Decoration, EditorView, keymap, type DecorationSet } from "@codemirror/view";
import { indentMore, indentLess } from "@codemirror/commands";
import { acceptCompletion, autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { StreamLanguage, HighlightStyle, syntaxHighlighting, indentUnit, indentService, getIndentUnit } from "@codemirror/language";
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
// Két szín, mint a felület többi részén: a kulcsszavak aranyak, minden más fehér vagy szürke árnyalat.
// Az érték (szám, logikai) fehér, a változónév halványabb, a műveleti jel szürke; hibás jel téglaszínű.
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#f0a700" },
  { tag: tags.bool, color: "#eae7dd", fontWeight: "600" },
  { tag: tags.number, color: "#eae7dd", fontWeight: "600" },
  { tag: tags.operator, color: "#8a857a" },
  { tag: tags.variableName, color: "#c4bfb3" },
  { tag: tags.special(tags.variableName), color: "#eae7dd", fontWeight: "600" },
  { tag: tags.invalid, color: "#e8806f" },
]);
const theme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "14px", backgroundColor: "var(--code)", color: "var(--foreground)" },
    ".cm-scroller": { fontFamily: "var(--font-geist-mono), monospace", lineHeight: "1.95", overflow: "auto" },
    ".cm-content": { padding: "16px 0", minHeight: "100%", caretColor: "var(--primary)" },
    ".cm-line": { padding: "0 24px 0 10px" },
    ".cm-gutters": { backgroundColor: "var(--code)", border: "none", borderRight: "1px solid var(--border)", color: "#5e5950", paddingLeft: "8px" },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "30px", paddingRight: "12px" },
    ".cm-activeLine": { backgroundColor: "var(--code-highlight)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--primary)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)", borderLeftWidth: "2px" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "rgba(240, 167, 0, 0.22)" },
    ".cm-matchingBracket": { backgroundColor: "rgba(240, 167, 0, 0.22)", outline: "none" },
    "&.cm-focused": { outline: "none" },
    ".cm-foldGutter": { width: "12px" },
    ".cm-foldPlaceholder": { backgroundColor: "var(--accent)", border: "1px solid var(--border)", color: "var(--muted-foreground)" },
    ".cm-tooltip": { border: "1px solid var(--border)", borderRadius: "var(--radius)", backgroundColor: "var(--popover)", color: "var(--foreground)" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accent)", color: "var(--primary)" },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-geist-mono), monospace" },
    ".cm-run-line": { backgroundColor: "rgba(240, 167, 0, 0.12)", boxShadow: "inset 3px 0 0 #f0a700" },
    ".cm-error-line": { backgroundColor: "rgba(140, 52, 43, 0.35)", boxShadow: "inset 3px 0 0 #e8806f" },
    ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy #e8806f", textUnderlineOffset: "4px" },
    ".cm-error-span": { textDecoration: "underline wavy #e8806f", textUnderlineOffset: "4px", backgroundColor: "rgba(140, 52, 43, 0.5)", borderRadius: "2px" },
    ".cm-diagnostic": { whiteSpace: "pre-line", maxWidth: "420px", fontFamily: "var(--font-geist-mono), monospace", fontSize: "12px" },
    ".cm-diagnostic-error": { borderLeftColor: "#e8806f" },
    ".cm-diagnosticSource": { opacity: "0.7" },
    ".cm-panels": { backgroundColor: "var(--popover)", color: "var(--foreground)" },
    ".cm-searchMatch": { backgroundColor: "rgba(234, 231, 221, 0.18)" },
  },
  { dark: true },
);

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
    validFor: /^[a-zA-Z]*$/,
    options: KEYWORDS.map((label) => ({ label, type: "keyword" })),
  };
}

// A Tab előbb a kijelölt javaslatot fogadja el, különben szóközökkel behúz.
export function completeOrIndent(view: EditorView) {
  const { state } = view;
  if (state.readOnly) return false;
  if (acceptCompletion(view)) return true;
  if (state.selection.ranges.some((range) => !range.empty)) return indentMore(view);

  view.dispatch(state.update(state.changeByRange((range) => {
    const line = state.doc.lineAt(range.head);
    const column = countColumn(line.text.slice(0, range.head - line.from), state.tabSize);
    const width = getIndentUnit(state);
    const spaces = " ".repeat(width - column % width);
    return {
      changes: { from: range.head, insert: spaces },
      range: EditorSelection.cursor(range.head + spaces.length),
    };
  }), { scrollIntoView: true, userEvent: "input" }));
  return true;
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
  /** A szerkesztőterület akadálymentes neve (a felület nyelvén). */
  label: string;
};

export default function CodeEditor({ value, onChange, onCursor, editorRef, wrap, readOnly = false, activeLine = null, label }: Props) {
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
          indentUnit.of("  "),
          keymap.of([{ key: "Tab", run: completeOrIndent, shift: indentLess }]),
          indentService.of((context, pos) => {
            const line = context.state.doc.lineAt(pos);
            const indent = line.text.match(/^ */)![0].length;
            return indent + (/^\s*(if |while |else$)/.test(line.text) ? 2 : 0);
          }),
          autocompletion({ override: [completeKeywords], interactionDelay: 0 }),
          lintGutter(),
          linter(lintMineScript, { delay: 350 }),
          wrapCompartment.current.of([]),
          readOnlyCompartment.current.of(EditorState.readOnly.of(false)),
          activeLineField,
          EditorView.contentAttributes.of({ spellcheck: "false" }),
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

  useEffect(() => {
    view.current?.contentDOM.setAttribute("aria-label", label);
  }, [label]);

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
