"use client";

// A közzétett térképek listája a kezdőlapon: mind vagy csak a sajátok, a legújabb elöl, lapozva.

import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import LoadingStatus from "@/components/loading-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";
import MapCard from "./map-card";

/** Egyszerre ennyi térképet töltünk be (a rácsban három oszlop fér el egymás mellett). */
const PAGE_SIZE = 9;

export default function PublishedMaps() {
  const { t } = useI18n();
  const [mine, setMine] = useState(false);
  const { results, status, loadMore } = usePaginatedQuery(api.maps.list, { mine }, { initialNumItems: PAGE_SIZE });

  return (
    <section aria-labelledby="published-title" className="space-y-3">
      {/* A fejléc, a szűrő és az üres/betöltés üzenet kártyán van, hogy a háttérkép előtt is olvasható legyen. */}
      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="published-title" className="panel-title">
              {t.home.publishedTitle}
            </h2>
            <p className="max-w-[72ch] font-read text-sm text-muted-foreground">{t.home.publishedIntro}</p>
          </div>
          <div role="group" aria-label={t.home.filter} className="flex gap-1.5">
            <Button variant="outline" size="sm" aria-pressed={!mine} onClick={() => setMine(false)}>
              {t.home.all}
            </Button>
            <Button variant="outline" size="sm" aria-pressed={mine} onClick={() => setMine(true)}>
              {t.home.mine}
            </Button>
          </div>
        </div>
        {status === "LoadingFirstPage" && <LoadingStatus message="loading" fullScreen={false} />}
        {status !== "LoadingFirstPage" && results.length === 0 && (
          <p className="font-read text-sm text-muted-foreground">{mine ? t.home.emptyMine : t.home.empty}</p>
        )}
      </Card>

      {results.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((map) => (
            <li key={map._id} className="flex">
              <MapCard map={map} />
            </li>
          ))}
        </ul>
      )}

      {status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => loadMore(PAGE_SIZE)}>
          {t.home.loadMore}
        </Button>
      )}
      {status === "LoadingMore" && (
        <Card className="p-3">
          <LoadingStatus message="loading" fullScreen={false} />
        </Card>
      )}
    </section>
  );
}
