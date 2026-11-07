import type { ReactNode } from "react";
import { Book, Check, Clock, Scale, TestTube, Warning } from "@/components/icons";
import { badgeVariants } from "@/components/ui/badge";

// Megjegyzésdobozok: a fajtát ikon és cím jelzi (nem csak szín). Az arany csak a figyelmeztetés ikonján jelenik meg.
const NOTE_STYLES = {
  spec: { label: "A kiírás szerint", Icon: Book, icon: "" },
  decision: { label: "Projektdöntés", Icon: Scale, icon: "" },
  future: { label: "Tervezett", Icon: Clock, icon: "text-muted-foreground" },
  warn: { label: "Figyelem", Icon: Warning, icon: "text-gold" },
} as const;

export function Note({
  tone,
  title,
  children,
}: {
  tone: keyof typeof NOTE_STYLES;
  title?: string;
  children: ReactNode;
}) {
  const { label, Icon, icon } = NOTE_STYLES[tone];
  return (
    <aside className="pixel-frame my-6 bg-card px-5 py-4">
      <p className="m-0 mb-2 flex items-center gap-2 font-pixel text-[15px]">
        <Icon size={16} className={icon} aria-hidden /> {title ?? label}
      </p>
      <div className="note-body text-[15px] text-muted-foreground [&_strong]:text-foreground">{children}</div>
    </aside>
  );
}

/** Szerveroldalon is használható jelvény: a shadcn Badge kinézete és pixelkerete, hook nélkül. */
export function DocBadge({
  variant = "outline",
  className = "",
  children,
}: {
  variant?: "outline" | "destructive";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={`${badgeVariants({ variant })} font-pixel align-middle ${className}`}
    >
      {children}
    </span>
  );
}

export function Status({ kind }: { kind: "done" | "prototype" | "planned" }) {
  const map = {
    done: { label: "Kész", Icon: Check, className: "" },
    prototype: { label: "Prototípus", Icon: TestTube, className: "text-gold" },
    planned: { label: "Tervezett", Icon: Clock, className: "text-muted-foreground" },
  } as const;
  const { label, Icon, className } = map[kind];
  return (
    <DocBadge className={className}>
      <Icon aria-hidden /> {label}
    </DocBadge>
  );
}
