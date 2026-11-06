"use client";

// A print kimenete és a változók aktuális értéke.

import { useEffect, useRef } from "react";
import type { Snapshot } from "@/lib/interpreter";

export default function RunConsole({ snapshot }: { snapshot: Snapshot }) {
  const consoleEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEnd.current?.scrollIntoView({ block: "nearest" });
  }, [snapshot.output.length]);

  return (
    <section className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-lg border border-[#dfe4ec] bg-white p-3" aria-labelledby="console-title">
      <h2 id="console-title" className="text-sm font-semibold">Console</h2>
      <div role="log" aria-live="polite" className="min-h-16 flex-1 overflow-auto rounded bg-[#1f2937] p-2 font-mono text-xs text-slate-100">
        {snapshot.output.length === 0 && <span className="text-slate-400">print output appears here</span>}
        {snapshot.output.map((line, index) => <div key={index}><span className="text-slate-500">&gt; </span>{line}</div>)}
        <div ref={consoleEnd} />
      </div>
      <div className="max-h-24 shrink-0 overflow-auto">
        <h3 className="mb-1 text-xs font-semibold text-[#65738a]">Variables</h3>
        {snapshot.variables.length === 0 ? (
          <p className="text-xs text-[#65738a]">None yet.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
            {snapshot.variables.map(([name, value]) => (
              <div key={name} className="contents"><dt className="text-[#247d88]">{name}</dt><dd>{String(value)}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
