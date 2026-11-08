"use client";

// A közzétett térképek, a legújabb elöl. Két helyen jelennek meg: a kezdőlapon csak az első néhány (szűrő nélkül, egy
// „összes” linkkel), a /maps oldalon mind, lapozva, a Mind/Saját szűrővel. Két részből áll: a fejléc (cím, szűrő vagy
// link, üres/betöltés üzenet) és alatta a térképek rácsa; a kettő ugyanazt az állapotot kapja.

import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import LoadingStatus from "@/components/loading-status";
import SectionHeader, { SeeAllLink } from "@/components/maps/section-header";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";
import { ROUTES } from "@/lib/routes";
import MapEntry from "./map-entry";

/** A /maps oldalon egyszerre ennyit töltünk be (a rácsban három oszlop fér el egymás mellett). */
export const PAGE_SIZE = 9;
/** A kezdőlapon ennyi közzétett térkép látszik (két sor). */
export const HOME_PUBLISHED_COUNT = 6;

/** A szűrő állapota és a betöltött térképek; a fejléc és a lista ugyanezt kapja. */
export function usePublishedMaps(pageSize = PAGE_SIZE) {
  const [mine, setMine] = useState(false);
  const { results, status, loadMore } = usePaginatedQuery(api.maps.list, { mine }, { initialNumItems: pageSize });
  return { mine, setMine, results, status, loadMore: () => loadMore(pageSize) };
}

type Maps = ReturnType<typeof usePublishedMaps>;

/** @param full A /maps oldal: h1 cím és szűrő; különben (kezdőlap) h2 cím és „összes” link. */
export function PublishedMapsHeader({ maps, full = false }: { maps: Maps; full?: boolean }) {
  const { t } = useI18n();
  const { mine, setMine, results, status } = maps;
  return (
    <div className="space-y-3">
      <SectionHeader
        id="published-title"
        title={t.home.publishedTitle}
        intro={t.home.publishedIntro}
        level={full ? 1 : 2}
      >
        {full ? (
          <div role="group" aria-label={t.home.filter} className="flex gap-1.5">
            <Button variant="outline" size="sm" aria-pressed={!mine} onClick={() => setMine(false)}>
              {t.home.all}
            </Button>
            <Button variant="outline" size="sm" aria-pressed={mine} onClick={() => setMine(true)}>
              {t.home.mine}
            </Button>
          </div>
        ) : (
          <SeeAllLink href={ROUTES.maps} label={t.home.allPublished} />
        )}
      </SectionHeader>
      {status === "LoadingFirstPage" && <LoadingStatus message="loading" fullScreen={false} />}
      {status !== "LoadingFirstPage" && results.length === 0 && (
        <p className="font-read text-sm text-muted-foreground">{mine ? t.home.emptyMine : t.home.empty}</p>
      )}
    </div>
  );
}

/** @param limit A kezdőlapon legfeljebb ennyi térkép, lapozás nélkül; nélküle mind, „Továbbiak” gombbal. */
export function PublishedMapsList({ maps, limit }: { maps: Maps; limit?: number }) {
  const { t } = useI18n();
  const { results, status, loadMore } = maps;
  const shown = limit === undefined ? results : results.slice(0, limit);
  return (
    <>
      {shown.length > 0 && (
        <ul aria-labelledby="published-title" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((map) => (
            <li key={map._id} className="flex">
              <MapEntry map={map} />
            </li>
          ))}
        </ul>
      )}
      {limit === undefined && status === "CanLoadMore" && (
        <Button variant="outline" className="self-start" onClick={loadMore}>
          {t.home.loadMore}
        </Button>
      )}
      {limit === undefined && status === "LoadingMore" && <LoadingStatus message="loading" fullScreen={false} />}
    </>
  );
}
