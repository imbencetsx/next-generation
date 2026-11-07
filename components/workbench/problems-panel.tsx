"use client";

// A szintaktikai hibák listája (kattintásra a hibás helyre ugrik) és egy összecsukható nyelvi gyorsreferencia.

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
  onJump: (line: number, column?: number) => void;
};

export default function ProblemsPanel({ issues, onJump }: Props) {
  const { t } = useI18n();

  return (
    <Card role="region" aria-labelledby="problems" className="min-h-0 gap-0 overflow-y-auto p-3">
      <h2 id="problems" className="panel-title mb-2 flex items-center gap-2">
        {t.editor.problems}
        {issues.length > 0 && (
          <Badge variant="destructive" className="font-mono tracking-normal">
            {issues.length}
          </Badge>
        )}
      </h2>

      {issues.length === 0 ? (
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

function IssueItem({ issue, onJump }: { issue: SyntaxIssue; onJump: Props["onJump"] }) {
  const { t } = useI18n();
  return (
    <li className="rounded border border-transparent px-2 py-1.5 hover:border-border hover:bg-accent/40">
      <button className="w-full text-left text-sm" onClick={() => onJump(issue.line, issue.column)}>
        <span className="mr-2 font-mono text-xs text-brick-text">
          Ln {issue.line}:{issue.column}
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
    </li>
  );
}
