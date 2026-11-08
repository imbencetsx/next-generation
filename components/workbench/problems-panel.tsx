"use client";

// A szintaktikai hibák listája (kattintásra a hibás helyre ugrik) és egy összecsukható nyelvi gyorsreferencia.

import DiagnosticDetails from "@/components/diagnostic-details";
import { localizedDiagnostic } from "@/i18n/diagnostics";
import RunErrorBox from "@/components/run-error-box";
import type { RunError } from "@/lib/interpreter";
import { Check } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";
import type { SyntaxIssue } from "@/lib/minescript";

// A szintaxis nem fordítandó; a leírás a szótárból jön (editor.referenceItems).
const REFERENCE = [
  ["set <name> to <expr>", "set"],
  ["step forward <v>", "step"],
  ["turn by <v>", "turn"],
  ["mine here", "mine"],
  ["print <v>", "print"],
  ["if <v>  /  else", "if"],
  ["while <v>", "while"],
] as const;

type Props = {
  issues: SyntaxIssue[];
  runtimeError: RunError | null;
  onJump: (line: number, column?: number) => void;
};

export default function ProblemsPanel({ issues, runtimeError, onJump }: Props) {
  const { t } = useI18n();
  const count = issues.length + (runtimeError ? 1 : 0);

  return (
    <Card role="region" aria-labelledby="problems" className="min-h-0 gap-0 overflow-y-auto p-3">
      <h2 id="problems" className="panel-title mb-2 flex items-center gap-2">
        {t.editor.problems}
        {count > 0 && (
          <Badge variant="destructive" className="font-mono tracking-normal">
            {count}
          </Badge>
        )}
      </h2>

      {runtimeError && <RunErrorBox error={runtimeError} onJump={onJump} />}
      {count === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check size={14} aria-hidden /> <span className="font-read">{t.editor.nothingToFix}</span>
        </p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <IssueItem key={`${issue.line}:${issue.column}:${issue.code}`} issue={issue} onJump={onJump} />
          ))}
        </ul>
      )}

      <details className="mt-3 border-t border-border pt-2">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          {t.editor.reference}
        </summary>
        <dl className="mt-2 space-y-1.5 text-sm">
          {REFERENCE.map(([syntax, key]) => (
            <div key={syntax}>
              <dt className="font-mono text-xs text-foreground">{syntax}</dt>
              <dd className="font-read text-muted-foreground">{t.editor.referenceItems[key]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 font-read text-[13px] text-muted-foreground">{t.editor.referenceNote}</p>
      </details>
    </Card>
  );
}

function IssueItem({ issue: original, onJump }: { issue: SyntaxIssue; onJump: Props["onJump"] }) {
  const { t, locale } = useI18n();
  const issue = localizedDiagnostic(original, locale);
  return (
    <li className="rounded border border-transparent px-2 py-1.5 hover:border-border hover:bg-accent/40">
      <button className="w-full text-left text-sm" onClick={() => onJump(issue.line, issue.column)}>
        <span className="mr-2 font-mono text-xs text-brick-text">
          {t.mapEditor.errorLocation(issue.line, issue.column)}
        </span>
        <Badge variant="destructive" className="mr-2 h-4 px-1 font-mono text-[10px]">
          {issue.code}
        </Badge>
        <span className="font-read">{issue.message}</span>
      </button>
      {issue.hint && (
        <p className="mt-1 whitespace-pre-line pl-1 font-read text-[13px] text-muted-foreground">
          <span className="text-foreground">{t.editor.hint}</span> {issue.hint}
        </p>
      )}
      {issue.related?.map((item) => (
        <button
          key={item.line + item.message}
          className="block pl-1 text-xs underline underline-offset-4"
          onClick={() => onJump(item.line)}
        >
          {t.editor.relatedLine(item.line)} {item.message}
        </button>
      ))}
      <DiagnosticDetails diagnostic={original} />
    </li>
  );
}
