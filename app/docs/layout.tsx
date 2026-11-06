import Link from "next/link";
import { BookOpen, Code2 } from "lucide-react";
import DocsSidebar from "@/components/docs/sidebar";

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  // A dokumentáció magyar; a gyökér <html> nyelve az alkalmazás felületéé.
  return (
    <div lang="hu" className="docs flex min-h-dvh flex-1 flex-col">
      <a href="#docs-content" className="skip-link">Ugrás a tartalomra</a>
      <header className="sticky top-0 z-10 border-b border-[var(--d-border)] bg-[var(--d-bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/docs" className="flex items-center gap-2 font-semibold text-[var(--d-strong)] no-underline">
            <BookOpen size={18} aria-hidden /> MineScript dokumentáció
          </Link>
          <Link href="/test" className="dbtn ml-auto">
            <Code2 size={14} aria-hidden /> Szerkesztő
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="lg:sticky lg:top-20 lg:w-60 lg:shrink-0 lg:self-start">
          <DocsSidebar />
        </aside>
        <main id="docs-content" className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
