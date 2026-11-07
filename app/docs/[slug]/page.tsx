import type { Metadata } from "next";
import { Suspense, type ComponentType } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { notFound } from "next/navigation";
import { DOC_PAGES, type DocSlug } from "@/lib/docs/nav";
import Attekintes from "@/components/docs/pages/attekintes";
import Nyelv from "@/components/docs/pages/nyelv";
import Robot from "@/components/docs/pages/robot";
import Terkepek from "@/components/docs/pages/terkepek";
import Interpreter from "@/components/docs/pages/interpreter";
import Hibak from "@/components/docs/pages/hibak";
import Dontesek from "@/components/docs/pages/dontesek";

const CONTENT: Record<DocSlug, ComponentType> = {
  attekintes: Attekintes,
  nyelv: Nyelv,
  robot: Robot,
  terkepek: Terkepek,
  interpreter: Interpreter,
  hibak: Hibak,
  dontesek: Dontesek,
};

const findPage = (slug: string) => DOC_PAGES.find((page) => page.slug === slug);

export function generateStaticParams() {
  return DOC_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const page = findPage((await params).slug);
  return page ? { title: `${page.title} · MineScript Nyelv Dokumentáció`, description: page.description } : {};
}

export default function DocPage({ params }: PageProps<"/docs/[slug]">) {
  return (
    <Suspense fallback={<p role="status" className="text-muted-foreground">Nyelv Dokumentáció betöltése…</p>}>
      <DocArticle params={params} />
    </Suspense>
  );
}

async function DocArticle({ params }: Pick<PageProps<"/docs/[slug]">, "params">) {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) notFound();

  const Content = CONTENT[page.slug];
  const index = DOC_PAGES.indexOf(page);
  const previous = DOC_PAGES[index - 1];
  const next = DOC_PAGES[index + 1];

  return (
    <article className="docs-prose">
      <header className="mb-10">
        <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">{index + 1}. fejezet / {DOC_PAGES.length}</p>
        <h1>{page.title}</h1>
        <p className="lead">{page.description}</p>
      </header>
      <Content />
      <nav aria-label="Lapozás" className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
        {previous ? (
          <Link href={`/docs/${previous.slug}`} className="pixel-frame flex items-center gap-3 bg-card px-4 py-3 hover:bg-accent">
            <ChevronLeft size={18} className="shrink-0 text-muted-foreground" aria-hidden />
            <span><span className="block font-pixel text-xs text-muted-foreground">Előző</span><span className="font-pixel">{previous.title}</span></span>
          </Link>
        ) : <span aria-hidden />}
        {next && (
          <Link href={`/docs/${next.slug}`} className="pixel-frame flex items-center justify-end gap-3 bg-card px-4 py-3 text-right hover:bg-accent sm:col-start-2">
            <span><span className="block font-pixel text-xs text-muted-foreground">Következő</span><span className="font-pixel">{next.title}</span></span>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  );
}
