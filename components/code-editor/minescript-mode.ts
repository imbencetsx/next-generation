// A MineScript nyelvi támogatása a CodeMirrorhoz: kiemelés, kiegészítés, behúzás és élő hibajelzés.
// A hibákat ugyanaz az elemző adja, amelyik a futtatást is (lib/syntax), így a kettő mindig egyezik.

import { acceptCompletion, autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { indentMore } from "@codemirror/commands";
import { getIndentUnit, HighlightStyle, indentService, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";
import { countColumn, EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { MESSAGES } from "@/i18n/messages";
import type { Locale } from "@/i18n/locale";
import { localizedDiagnostic } from "@/i18n/diagnostics";
import { tags } from "@lezer/highlight";
import { KEYWORDS, TOKEN_PATTERNS, isBooleanLiteral, validateMineScript } from "@/lib/minescript";

/** Egy behúzási szint a szerkesztőben (a nyelv bármilyen egységes szélességet elfogad). */
export const INDENT = "  ";

/**
 * Tokenizáló a kiemeléshez, a nyelv saját tokenmintáival (lib/syntax/vocabulary.ts).
 * Az érvényességet nem ez dönti el, hanem a linter (ugyanaz az elemző, mint a futtatásnál).
 */
const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(TOKEN_PATTERNS.number)) return "number";
    if (stream.match(TOKEN_PATTERNS.operator)) return "operator";
    const word = stream.match(TOKEN_PATTERNS.word);
    if (Array.isArray(word)) {
      const value = word[0];
      if (isBooleanLiteral(value)) return "bool";
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
const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--primary)" },
  { tag: tags.bool, color: "var(--foreground)", fontWeight: "600" },
  { tag: tags.number, color: "var(--foreground)", fontWeight: "600" },
  { tag: tags.operator, color: "#8a857a" },
  { tag: tags.variableName, color: "#c4bfb3" },
  { tag: tags.special(tags.variableName), color: "var(--foreground)", fontWeight: "600" },
  { tag: tags.invalid, color: "var(--brick-text)" },
]);

function completeKeywords(context: CompletionContext) {
  const word = context.matchBefore(/[a-zA-Z]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    validFor: /^[a-zA-Z]*$/,
    options: KEYWORDS.map((label) => ({ label, type: "keyword" })),
  };
}

/** Új sor behúzása: az előző sor szintje, blokknyitó (if, while, else) után egy szinttel beljebb. */
const indentAfterBlockOpeners = indentService.of((context, pos) => {
  const line = context.state.doc.lineAt(pos);
  const indent = line.text.match(/^ */)![0].length;
  const opensBlock = /^\s*(if |while |else$)/.test(line.text);
  return indent + (opensBlock ? INDENT.length : 0);
});

/** Tab: előbb a kiválasztott javaslatot fogadja el, kijelölésnél behúz, különben a következő tabpozícióig szóközt ír. */
export function completeOrIndent(view: EditorView) {
  const { state } = view;
  if (state.readOnly) return false;
  if (acceptCompletion(view)) return true;
  if (state.selection.ranges.some((range) => !range.empty)) return indentMore(view);

  view.dispatch(
    state.update(
      state.changeByRange((range) => {
        const line = state.doc.lineAt(range.head);
        const column = countColumn(line.text.slice(0, range.head - line.from), state.tabSize);
        const width = getIndentUnit(state);
        const spaces = " ".repeat(width - (column % width));
        return {
          changes: { from: range.head, insert: spaces },
          range: EditorSelection.cursor(range.head + spaces.length),
        };
      }),
      { scrollIntoView: true, userEvent: "input" },
    ),
  );
  return true;
}

/** A szintaktikai hibák CodeMirror-jelölésként, üzenettel, javaslattal és a kapcsolódó sorokkal. */
function lintMineScript(view: EditorView, locale: Locale): Diagnostic[] {
  const doc = view.state.doc;
  return validateMineScript(doc.toString()).map((original) => {
    const issue = localizedDiagnostic(original, locale);
    const line = doc.line(issue.line);
    const from = Math.min(line.to, line.from + issue.column - 1);
    // Üres sornál nincs mit aláhúzni, ilyenkor a sor elejére tesszük a jelölést.
    const to = Math.max(from, Math.min(line.to, line.from + issue.endColumn - 1));
    const related = issue.related
      ?.map((item) => `${MESSAGES[locale].editor.relatedLine(item.line)} ${item.message}`)
      .join("\n");
    return {
      from,
      to,
      severity: "error",
      source: issue.code,
      message: [issue.message, issue.hint, related].filter(Boolean).join("\n"),
    };
  });
}

/** Minden, ami a MineScript szerkesztéséhez kell, egyetlen bővítménylistában. */
export const createMineScriptSupport = (locale: Locale) => [
  language,
  syntaxHighlighting(highlightStyle),
  indentAfterBlockOpeners,
  autocompletion({ override: [completeKeywords], interactionDelay: 0 }),
  linter((view) => lintMineScript(view, locale), { delay: 350 }),
];

export const minescriptSupport = createMineScriptSupport("en");
