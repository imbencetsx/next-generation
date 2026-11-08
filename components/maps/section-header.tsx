// Egy térképszakasz fejléce (kezdőlap és a térképlisták oldalai): cím, rövid bevezető, jobbra a szakasz művelete
// (az „összes” link vagy a szűrő). A címsor szintje állítható: a kezdőlapon h2, a saját oldalán h1.

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  id: string;
  title: string;
  intro: string;
  level?: 1 | 2;
  children?: ReactNode;
};

export default function SectionHeader({ id, title, intro, level = 2, children }: Props) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <Heading id={id} className={level === 1 ? "display text-4xl" : "font-pixel text-2xl"}>
          {title}
        </Heading>
        <p className="max-w-[60ch] font-read text-muted-foreground">{intro}</p>
      </div>
      {children}
    </div>
  );
}

/** A szakasz „összes” linkje a saját oldalára. */
export function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} data-slot="button" data-variant="outline" className={buttonVariants({ variant: "outline" })}>
      {label}
      <ChevronRight aria-hidden />
    </Link>
  );
}
