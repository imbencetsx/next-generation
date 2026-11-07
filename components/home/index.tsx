"use client";

// A kezdőlap (/): két belépési pont (program írása, térkép készítése) és a játékosok által közzétett térképek.
// A háttér pixel art kép (.home-background); minden szöveg kártyán ül, hogy a kép előtt is olvasható legyen.

import Link from "next/link";
import type { ReactNode } from "react";
import { Book, Code, MapIcon } from "@/components/icons";
import Logo from "@/components/logo";
import TopBar, { AccountActions } from "@/components/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";
import { ROUTES } from "@/lib/routes";
import PublishedMaps from "./published-maps";

export default function HomePage() {
  const { t } = useI18n();
  return (
    <div className="app-ui relative isolate min-h-dvh">
      <div className="home-background" aria-hidden />
      <TopBar brand={<Logo />}>
        <Link
          href={ROUTES.docs}
          data-slot="button"
          data-variant="ghost"
          className={buttonVariants({ variant: "ghost" })}
        >
          <Book aria-hidden />
          <span className="max-sm:sr-only">{t.editor.docs}</span>
        </Link>
        <AccountActions />
      </TopBar>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
        <Card className="gap-3 p-6 sm:p-8">
          <h1 className="display text-4xl sm:text-5xl">{t.home.heading}</h1>
          <p className="max-w-[72ch] font-read text-muted-foreground">{t.home.intro}</p>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <StartCard
            icon={<Code aria-hidden />}
            title={t.home.writeTitle}
            text={t.home.writeText}
            action={t.home.writeAction}
            href={ROUTES.workbench}
            primary
          />
          <StartCard
            icon={<MapIcon aria-hidden />}
            title={t.home.makeTitle}
            text={t.home.makeText}
            action={t.home.makeAction}
            href={ROUTES.mapEditor}
          />
        </div>

        <PublishedMaps />
      </main>
    </div>
  );
}

type StartCardProps = {
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
  href: string;
  /** A terület egyetlen fő művelete arany gombot kap (a többi körvonalas). */
  primary?: boolean;
};

function StartCard({ icon, title, text, action, href, primary = false }: StartCardProps) {
  const variant = primary ? "default" : "outline";
  return (
    <Card className="gap-3 p-5">
      <h2 className="panel-title flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="font-read text-sm text-muted-foreground">{text}</p>
      <Link
        href={href}
        data-slot="button"
        data-variant={variant}
        className={buttonVariants({ variant, className: "mt-auto self-start" })}
      >
        {action}
      </Link>
    </Card>
  );
}
