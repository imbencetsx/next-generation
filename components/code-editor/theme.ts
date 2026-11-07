// A szerkesztő megjelenése az alkalmazás színeivel (app/globals.css változói).
// Arany: kurzor, kijelölés, futó sor; tégla: hibák. Más kiemelőszín nincs.

import { EditorView } from "@codemirror/view";

const GOLD_TINT = "rgb(240 167 0 / 0.22)";
const BRICK_TINT = "rgb(140 52 43 / 0.35)";
const WAVY_ERROR_UNDERLINE = { textDecoration: "underline wavy var(--brick-text)", textUnderlineOffset: "4px" };
const MONO = "var(--font-geist-mono), monospace";

export const editorTheme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "14px", backgroundColor: "var(--code)", color: "var(--foreground)" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: MONO, lineHeight: "1.95", overflow: "auto" },
    ".cm-content": { padding: "16px 0", minHeight: "100%", caretColor: "var(--primary)" },
    ".cm-line": { padding: "0 24px 0 10px" },

    // Sorszámok és összecsukás
    ".cm-gutters": {
      backgroundColor: "var(--code)",
      border: "none",
      borderRight: "1px solid var(--border)",
      color: "#5e5950",
      paddingLeft: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "30px", paddingRight: "12px" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--primary)" },
    ".cm-foldGutter": { width: "12px" },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--accent)",
      border: "1px solid var(--border)",
      color: "var(--muted-foreground)",
    },

    // Kurzor és kijelölés
    ".cm-activeLine": { backgroundColor: "var(--code-highlight)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)", borderLeftWidth: "2px" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: GOLD_TINT },
    ".cm-matchingBracket": { backgroundColor: GOLD_TINT, outline: "none" },
    ".cm-searchMatch": { backgroundColor: "rgb(234 231 221 / 0.18)" },
    ".cm-panels": { backgroundColor: "var(--popover)", color: "var(--foreground)" },

    // Futás közben kiemelt sor (active-line.ts)
    ".cm-run-line": { backgroundColor: "rgb(240 167 0 / 0.12)", boxShadow: "inset 3px 0 0 var(--primary)" },
    ".cm-error-line": { backgroundColor: BRICK_TINT, boxShadow: "inset 3px 0 0 var(--brick-text)" },
    ".cm-error-span": { ...WAVY_ERROR_UNDERLINE, backgroundColor: "rgb(140 52 43 / 0.5)", borderRadius: "2px" },

    // Szintaktikai hibák (linter) és a felugró ablakok
    ".cm-lintRange-error": { ...WAVY_ERROR_UNDERLINE, backgroundImage: "none" },
    ".cm-diagnostic": { whiteSpace: "pre-line", maxWidth: "420px", fontFamily: MONO, fontSize: "12px" },
    ".cm-diagnostic-error": { borderLeftColor: "var(--brick-text)" },
    ".cm-diagnosticSource": { opacity: "0.7" },
    ".cm-tooltip": {
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      backgroundColor: "var(--popover)",
      color: "var(--foreground)",
    },
    ".cm-tooltip-autocomplete > ul": { fontFamily: MONO },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accent)", color: "var(--primary)" },
  },
  { dark: true },
);
