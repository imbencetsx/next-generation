// A futás közben kiemelt sor a szerkesztőben: arany a futó sor, tégla a hibás sor és benne a hibás rész.

import { StateEffect, StateField, type Text } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

/** A kiemelt sor; futásidejű hibánál az oszloptartomány a hibás részt is megjelöli. */
export type ActiveLine = { line: number; tone: "run" | "error"; column?: number; endColumn?: number } | null;

export const setActiveLine = StateEffect.define<ActiveLine>();

function decorationsFor(target: NonNullable<ActiveLine>, doc: Text): DecorationSet {
  const line = doc.line(target.line);
  const className = target.tone === "error" ? "cm-error-line" : "cm-run-line";
  const ranges = [Decoration.line({ class: className }).range(line.from)];

  if (target.tone === "error" && target.column && target.endColumn) {
    const from = Math.min(line.to, line.from + target.column - 1);
    const to = Math.min(line.to, line.from + target.endColumn - 1);
    if (to > from) ranges.push(Decoration.mark({ class: "cm-error-span" }).range(from, to));
  }
  return Decoration.set(ranges);
}

/** A kiemelést tároló állapotmező; a `setActiveLine` hatással cserélhető. */
export const activeLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setActiveLine)) continue;
      const target = effect.value;
      const exists = target && target.line <= transaction.state.doc.lines;
      decorations = exists ? decorationsFor(target, transaction.state.doc) : Decoration.none;
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});
