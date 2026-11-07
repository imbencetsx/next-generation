"use client";

// Egy közzétett térkép oldala (/maps/<azonosító>): balra a térkép nagyban, a neve, szerzője, mérete és a
// programírás gombja; jobbra a teljes ranglista. A kezdőlap térképeinek „Ranglista” gombja vezet ide.

import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { MiniMap } from "@/components/docs/mini-map";
import { Book, ChevronLeft, Code } from "@/components/icons";
import LoadingStatus from "@/components/loading-status";
import Logo from "@/components/logo";
import TopBar, { AccountActions } from "@/components/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";
import { parseMap } from "@/lib/robot-map";
import { ROUTES, withMap } from "@/lib/routes";
import MapLeaderboard from "./leaderboard";

/** A nagy előnézet legfeljebb ekkora helyet foglal; a mezőméret egész pixel, hogy a pixel art éles maradjon. */
const PREVIEW_SIZE = 420;
const MAX_PREVIEW_CELL = 64;

export default function MapPage({ mapId }: { mapId: string }) {
  const { t } = useI18n();
  // undefined: még tölt; null: nincs ilyen térkép (rossz link vagy törölték).
  const map = useQuery(api.maps.get, { mapId });

  return (
    <div className="app-ui min-h-dvh">
      <TopBar
        brand={
          <Link href={ROUTES.home} aria-label={t.home.title}>
            <Logo />
          </Link>
        }
      >
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

        {map === undefined && <LoadingStatus message="loading" fullScreen={false} />}
        {map === null && (
          <div className="space-y-3">
            <h1 className="font-pixel text-3xl">{t.mapPage.notFoundTitle}</h1>
            <p className="font-read text-muted-foreground">{t.mapPage.notFound}</p>
          </div>
        )}
        {map && <MapDetails map={map} />}
      </main>
    </div>
  );
}

type PublishedMap = NonNullable<FunctionReturnType<typeof api.maps.get>>;

function MapDetails({ map }: { map: PublishedMap }) {
  const { t, locale } = useI18n();
  const parsed = parseMap(map.text);
  const cell = Math.min(MAX_PREVIEW_CELL, Math.floor(PREVIEW_SIZE / Math.max(map.rows, map.cols)));
  const published = new Date(map._creationTime);

  return (
    <div className="grid gap-12 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col gap-5">
        {parsed.ok && (
          <MiniMap map={parsed.map} cell={cell} label={t.home.preview(map.name, map.rows, map.cols)} shine />
        )}
        <div className="space-y-1">
          <h1 className="font-pixel text-3xl break-words">{map.name}</h1>
          <p className="font-read text-muted-foreground">
            {t.home.by(map.isMine ? t.home.you : map.authorName)},{" "}
            <time dateTime={published.toISOString()}>{published.toLocaleDateString(locale)}</time>
          </p>
          <p className="font-read text-muted-foreground">{t.home.details(map.rows, map.cols, map.goldCount)}</p>
        </div>
        <Link
          href={withMap(ROUTES.workbench, map.text, map.name, map._id)}
          data-slot="button"
          data-variant="default"
          className={buttonVariants({ size: "lg", className: "self-start" })}
        >
          <Code aria-hidden />
          {t.home.program}
        </Link>
      </div>

      <section aria-labelledby="leaderboard-title" className="min-w-0 space-y-4">
        <div className="space-y-1">
          <h2 id="leaderboard-title" className="font-pixel text-2xl">
            {t.mapPage.leaderboard}
          </h2>
          <p className="font-read text-muted-foreground">{t.mapPage.rule}</p>
        </div>
        <MapLeaderboard mapId={map._id} labelledBy="leaderboard-title" />
      </section>
    </div>
  );
}
