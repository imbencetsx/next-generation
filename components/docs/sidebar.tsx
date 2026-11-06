"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { DOC_PAGES } from "@/lib/docs/nav";

export default function DocsSidebar() {
  const active = useSelectedLayoutSegment();
  return (
    <nav aria-label="Dokumentáció">
      <ol className="m-0 flex list-none gap-1 overflow-x-auto p-0 lg:flex-col lg:overflow-visible">
        {DOC_PAGES.map((page, index) => {
          const current = page.slug === active;
          return (
            <li key={page.slug} className="shrink-0">
              <Link
                href={`/docs/${page.slug}`}
                aria-current={current ? "page" : undefined}
                className={`flex gap-2 rounded-md px-3 py-2 text-sm no-underline transition-colors ${
                  current ? "bg-[#1f2a3d] text-[var(--d-strong)]" : "text-[var(--d-muted)] hover:bg-[var(--d-panel)] hover:text-[var(--d-text)]"
                }`}
              >
                <span className="font-mono text-xs leading-5 text-[var(--d-muted)]">{index + 1}.</span>
                {page.title}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
