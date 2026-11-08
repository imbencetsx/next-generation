"use client";

// A két térképlista oldala: /maps/built-in (minden beépített pálya) és /maps (minden közzétett térkép, szűrővel és
// lapozással). Ugyanaz a váz, mint a térkép saját oldalán: felső sáv, vissza a kezdőlapra, alatta a nagy cím és a rács.

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "@/components/icons";
import { PublishedMapsHeader, PublishedMapsList, usePublishedMaps } from "@/components/home/published-maps";
import Logo from "@/components/logo";
import BuiltInMaps from "@/components/maps/built-in-maps";
import SectionHeader from "@/components/maps/section-header";
import TopBar, { AccountActions } from "@/components/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { ROUTES } from "@/lib/routes";

export function BuiltInMapsPage() {
  const { t } = useI18n();
  return (
    <MapsPageShell>
      <SectionHeader id="built-in-title" title={t.home.builtInTitle} intro={t.home.builtInIntro} level={1} />
      <BuiltInMaps />
    </MapsPageShell>
  );
}

export function PublishedMapsPage() {
  const maps = usePublishedMaps();
  return (
    <MapsPageShell>
      <PublishedMapsHeader maps={maps} full />
      <PublishedMapsList maps={maps} />
    </MapsPageShell>
  );
}

function MapsPageShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="app-ui min-h-dvh">
      <TopBar
        brand={
          <Link href={ROUTES.home} aria-label={t.home.title}>
            <Logo />
          </Link>
        }
      >
        <AccountActions />
      </TopBar>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <Link
          href={ROUTES.home}
          data-slot="button"
          data-variant="ghost"
          className={buttonVariants({ variant: "ghost", className: "self-start" })}
        >
          <ChevronLeft aria-hidden />
          {t.mapPage.back}
        </Link>
        {children}
      </main>
    </div>
  );
}
