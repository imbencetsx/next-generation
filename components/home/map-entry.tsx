"use client";

// Egy közzétett térkép a kezdőlap rácsában (pixeles kerettel, háttér nélkül): a térkép képe, a neve, a szerzője és mérete, valamint a
// műveletek: programot írni a munkafelületen lehet rá, a „Ranglista” a térkép oldalára visz, a saját térkép törölhető.

import Link from "next/link";
import { useMutation } from "convex/react";
import { useState } from "react";
import MapCard from "@/components/map-card";
import { Alert, Code, Trash, Trophy } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { mapErrorKey, type MapErrorKey } from "@/convex/mapRules";
import { useI18n } from "@/i18n/i18n-provider";
import { mapPath, ROUTES, withMap } from "@/lib/routes";

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

export default function MapEntry({ map }: { map: PublishedMap }) {
  const { t } = useI18n();
  return (
    <MapCard
      name={map.name}
      text={map.text}
      author={map.isMine ? t.home.you : map.authorName}
      publishedAt={map._creationTime}
    >
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={withMap(ROUTES.workbench, map.text, map.name, map._id)}
          data-slot="button"
          data-variant="default"
          className={buttonVariants()}
        >
          <Code aria-hidden />
          {t.home.program}
        </Link>
        <Link
          href={mapPath(map._id)}
          data-slot="button"
          data-variant="outline"
          className={buttonVariants({ variant: "outline" })}
        >
          <Trophy aria-hidden />
          {t.home.leaderboard}
        </Link>
        {map.isMine && <DeleteMap mapId={map._id} mapName={map.name} />}
      </div>
    </MapCard>
  );
}

/** Törlés: piros ikongomb, és mivel a térkép mindenkitől eltűnik (a ranglistájával együtt), megerősítést kér. */
function DeleteMap({ mapId, mapName }: { mapId: Id<"maps">; mapName: string }) {
  const { t } = useI18n();
  const remove = useMutation(api.maps.remove);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MapErrorKey | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    try {
      // Sikernél a kártya a párbeszédablakkal együtt eltűnik a listából (a lekérdezés frissül).
      await remove({ mapId });
    } catch (caught) {
      setError(mapErrorKey(caught));
      setPending(false);
    }
  }

  return (
    <AlertDialog onOpenChange={() => setError(null)}>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="icon" aria-label={t.home.deleteMap} title={t.home.deleteMap}>
            <Trash aria-hidden />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.home.deleteTitle(mapName)}</AlertDialogTitle>
          <AlertDialogDescription>{t.home.deleteText}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text">
            <Alert size={16} aria-hidden />
            {t.maps.errors[error]}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.home.cancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={() => void confirmDelete()}>
            <Trash aria-hidden />
            {t.home.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
