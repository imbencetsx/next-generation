import type { Metadata } from "next";
import type { ComponentType } from "react";
import Link from "next/link";
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
  return page ? { title: `${page.title} · MineScript dokumentáció`, description: page.description } : {};
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) notFound();

  const Content = CONTENT[page.slug];
  const index = DOC_PAGES.indexOf(page);
  const previous = DOC_PAGES[index - 1];
  const next = DOC_PAGES[index + 1];

  return (
    <article className="docs-prose">
      <header className="mb-8 border-b border-[var(--d-border)] pb-6">
        <h1>{page.title}</h1>
        <p className="lead">{page.description}</p>
      </header>
      <Content />
      <nav aria-label="Lapozás" className="mt-12 flex flex-wrap justify-between gap-3 border-t border-[var(--d-border)] pt-6">
        {previous ? <Link href={`/docs/${previous.slug}`} className="pager">← {previous.title}</Link> : <span />}
        {next && <Link href={`/docs/${next.slug}`} className="pager">{next.title} →</Link>}
      </nav>
    </article>
  );
}
