// A dokumentáció kerete. A dokumentáció szándékosan csak magyar (a verseny nyelve), ezért a szövegei
// közvetlenül a komponensekben vannak, nem az alkalmazás i18n szótárában; statikusan előrenderelt.

import Link from "next/link";
import { Code } from "@/components/icons";
import DocsSidebar from "@/components/docs/sidebar";
import Logo from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  // A gyökér <html> nyelve az alkalmazás felületéé, ezért itt külön jelöljük a magyart.
  return (
    <div lang="hu" className="app-ui docs flex min-h-dvh flex-1 flex-col">
      <a href="#docs-content" className="skip-link">
        Ugrás a tartalomra
      </a>
      <header className="topbar sticky top-0 z-20">
        <div className="mx-auto flex min-h-[68px] max-w-6xl items-center gap-4 px-4 py-1.5">
          <Link
            href={ROUTES.docs}
            className="flex items-center gap-3"
            aria-label="MineScript Nyelv Dokumentáció, kezdőlap"
          >
            <Logo />
            <span className="font-pixel text-[15px] text-muted-foreground max-sm:sr-only">Nyelv Dokumentáció</span>
          </Link>
          <Link
            href={ROUTES.workbench}
            className={`${buttonVariants({ variant: "outline" })} ml-auto`}
            data-slot="button"
            data-variant="outline"
          >
            <Code aria-hidden /> Szerkesztő
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 lg:flex-row lg:gap-12">
        <aside className="lg:sticky lg:top-[96px] lg:w-60 lg:shrink-0 lg:self-start">
          <DocsSidebar />
        </aside>
        <main id="docs-content" className="min-w-0 flex-1 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}
