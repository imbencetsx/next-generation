"use client";

// A print kimenete és a változók aktuális értéke.

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";
import type { Snapshot } from "@/lib/interpreter";

export default function RunConsole({ snapshot }: { snapshot: Snapshot }) {
  const { t } = useI18n();
  const consoleEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEnd.current?.scrollIntoView({ block: "nearest" });
  }, [snapshot.output.length]);

  return (
    <Card role="region" aria-labelledby="console-title" className="min-h-0 gap-2 p-3">
      <h2 id="console-title" className="panel-title">{t.console.title}</h2>
      <div role="log" aria-live="polite" className="pixel-frame min-h-16 flex-1 overflow-auto bg-code px-2.5 py-2 font-mono text-xs leading-relaxed">
        {snapshot.output.length === 0 && <span className="text-muted-foreground">{t.console.empty}</span>}
        {snapshot.output.map((line, index) => <div key={index}><span className="text-muted-foreground" aria-hidden>&gt; </span>{line}</div>)}
        <div ref={consoleEnd} />
      </div>
      <div className="max-h-24 shrink-0 overflow-auto">
        <h3 className="panel-title mb-1">{t.console.variables}</h3>
        {snapshot.variables.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.console.noVariables}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
            {snapshot.variables.map(([name, value]) => (
              <div key={name} className="contents"><dt className="text-muted-foreground">{name}</dt><dd>{String(value)}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </Card>
  );
}
