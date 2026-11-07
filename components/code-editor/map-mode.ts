// A térképfájlok nyelvi támogatása a CodeMirrorhoz: jelenkénti színezés és élő hibajelzés.
// Az érvényességet ugyanaz a térképolvasó (parseMap) dönti el, amelyik a szimulátor importját is ellenőrzi.

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { parseMap } from "@/lib/robot-map";

const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/\d+/)) return "number";
    const symbol = stream.next();
    if (symbol === ".") return "comment";
    if (symbol === "#") return "string";
    if (symbol === "@") return "atom";
    if (symbol && "^<>v".includes(symbol)) return "keyword";
    return "invalid";
  },
});

const highlight = HighlightStyle.define([
  { tag: tags.number, color: "var(--foreground)" },
  { tag: tags.comment, color: "var(--muted-foreground)" },
  { tag: tags.string, color: "var(--foreground)" },
  { tag: [tags.atom, tags.keyword], color: "var(--primary)", fontWeight: "600" },
  { tag: tags.invalid, color: "var(--brick-text)" },
]);

function lintMap(view: EditorView): Diagnostic[] {
  const doc = view.state.doc;
  const result = parseMap(doc.toString());
  if (result.ok) return [];
  const line = doc.line(Math.min(Math.max(1, result.line ?? 1), doc.lines));
  const from = Math.min(line.to, line.from + (result.column ?? 1) - 1);
  return [
    { from, to: result.column ? Math.min(line.to, from + 1) : line.to, severity: "error", message: result.error },
  ];
}

export const mapSupport = [language, syntaxHighlighting(highlight), linter(lintMap, { delay: 200 })];
