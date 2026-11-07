"use client";

// Egy közzétett térkép kártyája: előnézet, név, szerző, méret és arany, a legjobb 5 játékos, valamint a műveletek:
// programot írni a munkafelületen lehet rá, a saját térkép pedig törölhető.

import Link from "next/link";
import { useMutation } from "convex/react";
import { useState } from "react";
import { MiniMap } from "@/components/docs/mini-map";
import { Alert, Code, Trash } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { mapErrorKey, type MapErrorKey } from "@/convex/mapRules";
import { useI18n } from "@/i18n/i18n-provider";
import { parseMap } from "@/lib/robot-map";
import MapLeaderboard from "./map-leaderboard";
import { ROUTES, withMap } from "@/lib/routes";

/** A kártya előnézete ekkora helyre fér el (pixelben), a mezők ehhez igazodnak. */
// Minden kártyán ugyanakkora az előnézet helye, így a kártyák egyformák; a térkép ebbe fér bele, középre igazítva.
// A mezőméret egész pixel, hogy a pixel art éles maradjon.
const PREVIEW_WIDTH = 260;
const PREVIEW_HEIGHT = 216;
const MAX_PREVIEW_CELL = 40;

export type PublishedMap = {
  _id: Id<"maps">;
  _creationTime: number;
  name: string;
  text: string;
  rows: number;
  cols: number;
  goldCount: number;
  authorName: string;
  isMine: boolean;
};

export default function MapCard({ map }: { map: PublishedMap }) {
  const { t, locale } = useI18n();
  const parsed = parseMap(map.text);
  const cell = Math.min(MAX_PREVIEW_CELL, Math.floor(Math.min(PREVIEW_WIDTH / map.cols, PREVIEW_HEIGHT / map.rows)));
  const published = new Date(map._creationTime).toLocaleDateString(locale);
  const titleId = `map-${map._id}`;

  return (
    <Card className="w-full gap-3 p-4" role="article" aria-labelledby={titleId}>
      <div className="flex h-[248px] items-center justify-center overflow-hidden bg-background p-2">
        {parsed.ok && <MiniMap map={parsed.map} cell={cell} label={t.home.preview(map.name, map.rows, map.cols)} />}
      </div>
      <div className="space-y-1">
        <h3 id={titleId} className="truncate font-pixel text-base" title={map.name}>
          {map.name}
        </h3>
        <p className="font-read text-sm text-muted-foreground">
          {t.home.by(map.isMine ? t.home.you : map.authorName)} ·{" "}
          <time dateTime={new Date(map._creationTime).toISOString()}>{published}</time>
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {t.home.size(map.rows, map.cols)} · {t.home.gold(map.goldCount)}
        </p>
      </div>
      <MapLeaderboard mapId={map._id} mapName={map.name} />
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={withMap(ROUTES.workbench, map.text, map.name, map._id)}
          data-slot="button"
          data-variant="default"
          className={buttonVariants({ size: "sm" })}
        >
          <Code aria-hidden />
          {t.home.program}
        </Link>
        {map.isMine && <DeleteMap mapId={map._id} />}
      </div>
    </Card>
  );
}

/** Törlés két lépésben: a kártyán megerősítést kér, mert a térkép mindenkitől eltűnik. */
function DeleteMap({ mapId }: { mapId: Id<"maps"> }) {
  const { t } = useI18n();
  const remove = useMutation(api.maps.remove);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MapErrorKey | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    try {
      // Sikernél a kártya magától eltűnik a listából (a lekérdezés frissül).
      await remove({ mapId });
    } catch (caught) {
      setError(mapErrorKey(caught));
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash aria-hidden />
        {t.home.delete}
      </Button>
    );
  }
  return (
    <div className="flex basis-full flex-wrap items-center gap-2" role="group" aria-label={t.home.confirmDelete}>
      <span className="font-read text-sm">{t.home.confirmDelete}</span>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => void confirmDelete()}>
        {t.home.confirm}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        {t.home.cancel}
      </Button>
      {error && (
        <p role="alert" className="flex basis-full items-center gap-2 font-read text-sm text-brick-text">
          <Alert size={16} aria-hidden />
          {t.maps.errors[error]}
        </p>
      )}
    </div>
  );
}
