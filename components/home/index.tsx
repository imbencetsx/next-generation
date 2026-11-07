"use client";

// A kezdőlap (/): két belépési pont (program írása, térkép készítése) és a játékosok által közzétett térképek.
// A háttér pixel art kép (.home-background). A cím, a két belépési pont és a térképlista fejléce egyetlen dobozban
// van, hogy a kép előtt is olvashatók legyenek; alatta a térképkártyák.

import Link from "next/link";
import type { ComponentType } from "react";
import { Book, Code, MapIcon, type IconProps } from "@/components/icons";
import Logo from "@/components/logo";
import TopBar, { AccountActions } from "@/components/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";
import { ROUTES } from "@/lib/routes";
import { PublishedMapsHeader, PublishedMapsList, usePublishedMaps } from "./published-maps";

export default function HomePage() {
  const { t } = useI18n();
  const maps = usePublishedMaps();
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
        <Card className="gap-0 py-0">
          <div className="space-y-3 p-6 sm:p-8">
            <h1 className="display text-4xl sm:text-5xl">
              {t.home.heading.before}
              <span className="text-gold">{t.home.heading.gold}</span>
              {t.home.heading.after}
            </h1>
            <p className="max-w-[72ch] font-read text-muted-foreground">{t.home.intro}</p>
          </div>

          {/* A két belépési pont egymás mellett, vonallal elválasztva (keskeny kijelzőn egymás alatt). */}
          <div className="grid border-t border-border md:grid-cols-2">
            <StartSection
              icon={Code}
              title={t.home.writeTitle}
              text={t.home.writeText}
              action={t.home.writeAction}
              href={ROUTES.workbench}
              primary
            />
            <StartSection
              icon={MapIcon}
              title={t.home.makeTitle}
              text={t.home.makeText}
              action={t.home.makeAction}
              href={ROUTES.mapEditor}
              className="border-t border-border md:border-t-0 md:border-l"
            />
          </div>

          <div className="border-t border-border p-6 sm:px-8">
            <PublishedMapsHeader maps={maps} />
          </div>
        </Card>

        <PublishedMapsList maps={maps} />
      </main>
    </div>
  );
}

type StartSectionProps = {
  /** A bal oldalon nagyban megjelenő ikon. */
  icon: ComponentType<IconProps>;
  title: string;
  text: string;
  action: string;
  href: string;
  /** A terület egyetlen fő művelete arany gombot kap (a többi körvonalas). */
  primary?: boolean;
  className?: string;
};

/** Egy belépési pont a közös dobozban: balra nagy ikon, mellette cím, rövid leírás és egy nagy gomb. */
function StartSection({ icon: Icon, title, text, action, href, primary = false, className = "" }: StartSectionProps) {
  const variant = primary ? "default" : "outline";
  return (
    <div className={`flex items-start gap-5 p-6 sm:px-8 ${className}`}>
      <div className="pixel-frame flex size-20 shrink-0 items-center justify-center bg-background" aria-hidden>
        <Icon size={48} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="panel-title text-base">{title}</h2>
        <p className="font-read text-sm text-muted-foreground">{text}</p>
        <Link
          href={href}
          data-slot="button"
          data-variant={variant}
          className={buttonVariants({ variant, size: "lg", className: "mt-auto self-start" })}
        >
          <Icon aria-hidden />
          {action}
        </Link>
      </div>
    </div>
  );
}
