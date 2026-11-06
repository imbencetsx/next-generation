"use client";

// A fejezetek sorrendben olvasandók, ezért számozzuk őket; a kiválasztott fehér keretet kap.

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { DOC_PAGES } from "@/lib/docs/nav";

export default function DocsSidebar() {
  const active = useSelectedLayoutSegment();
  const list = useRef<HTMLOListElement>(null);

  // Telefonon a lista vízszintesen görgethető: a kiválasztott fejezet mindig látszódjon.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <nav aria-label="Fejezetek">
      <ol ref={list} className="m-0 flex list-none gap-1 overflow-x-auto p-0 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {DOC_PAGES.map((page, index) => {
          const current = page.slug === active;
          return (
            <li key={page.slug} className="shrink-0">
              <Link
                href={`/docs/${page.slug}`}
                aria-current={current ? "page" : undefined}
                data-tone={current ? "light" : undefined}
                className={`flex items-baseline gap-2.5 px-3 py-2 text-[15px] transition-colors ${
                  current ? "pixel-frame bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-mono text-xs text-muted-foreground" aria-hidden>{index + 1}</span>
                {page.title}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
