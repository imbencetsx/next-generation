import type { ReactNode } from "react";

const NOTE_STYLES = {
  spec: { label: "A kiírás szerint", className: "border-[#3b5ba5] bg-[#132036]" },
  decision: { label: "Projektdöntés", className: "border-[#8957e5] bg-[#1e1633]" },
  future: { label: "Tervezett", className: "border-[#2f81f7] bg-[#0f1b2d]" },
  warn: { label: "Figyelem", className: "border-[#d29922] bg-[#272010]" },
} as const;

export function Note({ tone, title, children }: { tone: keyof typeof NOTE_STYLES; title?: string; children: ReactNode }) {
  const style = NOTE_STYLES[tone];
  return (
    <aside className={`my-4 rounded-md border-l-4 px-4 py-3 text-sm ${style.className}`}>
      <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--d-muted)]">{title ?? style.label}</p>
      <div className="note-body">{children}</div>
    </aside>
  );
}

export function Status({ kind }: { kind: "done" | "prototype" | "planned" }) {
  const map = {
    done: ["Kész", "badge-good"],
    prototype: ["Prototípus", "badge-warn"],
    planned: ["Tervezett", "badge-muted"],
  } as const;
  const [label, className] = map[kind];
  return <span className={`badge ${className}`}>{label}</span>;
}
