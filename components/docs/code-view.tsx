import type { ReactNode } from "react";
import { KEYWORDS } from "@/lib/minescript";

const TOKEN = /(\t)|( +)|(\d+)|(<>|<=|>=|[+*=<>-])|([A-Za-z][A-Za-z0-9]*)|(.)/g;

function highlight(line: string): ReactNode[] {
  return [...line.matchAll(TOKEN)].map((match, index) => {
    const [text, tab, space, number, operator, word] = match;
    if (tab) return <span key={index} className="tok-tab" title="tabulátor">⇥</span>;
    if (space) return <span key={index}>{space}</span>;
    if (number) return <span key={index} className="tok-num">{number}</span>;
    if (operator) return <span key={index} className="tok-op">{operator}</span>;
    if (word) {
      const kind = word === "true" || word === "false" ? "tok-bool"
        : word === "isThere" ? "tok-fn"
        : KEYWORDS.includes(word) ? "tok-kw"
        : "tok-var";
      return <span key={index} className={kind}>{word}</span>;
    }
    return <span key={index} className="tok-bad">{text}</span>;
  });
}

/** Read-only MineScript code with line numbers. Works in server and client components. */
export function CodeView({ code, markLine }: { code: string; markLine?: number }) {
  const lines = code === "" ? [] : code.split("\n");
  return (
    <pre className="code-view">
      <code>
        {lines.length === 0 && <span className="text-[var(--d-muted)]">(üres program)</span>}
        {lines.map((line, index) => (
          <span key={index} className={`code-line${markLine === index + 1 ? " is-marked" : ""}`}>
            <span className="ln" aria-hidden>{index + 1}</span>
            {line === "" ? <span className="tok-empty">(üres sor)</span> : highlight(line)}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** Plain preformatted text such as grammar rules or map files. */
export function Pre({ children, label }: { children: string; label?: string }) {
  return (
    <div className="my-4">
      {label && <div className="mb-1 text-xs uppercase tracking-wide text-[var(--d-muted)]">{label}</div>}
      <pre className="code-view plain"><code>{children}</code></pre>
    </div>
  );
}
