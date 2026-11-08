"use client";

// A saját térkép kártyáján: ikongomb, ami párbeszédablakban mutatja, kik kedvelték a térképet. A fejlécben a térkép
// kis képe, a cím és a kedvelések száma, alatta a kedvelők profilképpel (likers-list.tsx).

import { useId } from "react";
import { MiniMap } from "@/components/docs/mini-map";
import { HeartFilled, Users } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";
import { parseMap } from "@/lib/robot-map";
import LikersList from "./likers-list";

type Props = { mapId: Id<"maps">; mapName: string; total: number; mapText?: string };

/** A fejléc térképképének legnagyobb oldala pixelben; a mezőméret ebből adódik. */
const PREVIEW_SIZE = 64;

export default function LikersDialog({ mapId, mapName, total, mapText }: Props) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="icon" aria-label={t.home.likersOf(mapName)} title={t.home.likersOf(mapName)}>
            <Users aria-hidden />
          </Button>
        }
      />
      <AlertDialogContent className="likers-dialog gap-5 sm:max-w-md">
        <AlertDialogHeader className="likers-dialog-header flex-row items-center gap-4 text-left">
          {mapText && <Preview text={mapText} />}
          <div className="min-w-0 flex-1 space-y-1.5">
            <AlertDialogTitle id={titleId} className="font-pixel text-lg leading-snug">
              {t.home.likersOf(mapName)}
            </AlertDialogTitle>
            <p className="flex items-center gap-1.5 font-read text-sm text-muted-foreground">
              <HeartFilled size={16} aria-hidden className="liker-heart" />
              {t.home.likeCount(total)}
            </p>
          </div>
        </AlertDialogHeader>
        <LikersList mapId={mapId} total={total} labelledBy={titleId} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t.home.close}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** A térkép kis képe a fejlécben; díszítés, a cím már megnevezi a térképet. */
function Preview({ text }: { text: string }) {
  const parsed = parseMap(text);
  if (!parsed.ok) return null;
  const { map } = parsed;
  const cell = Math.max(2, Math.floor(PREVIEW_SIZE / Math.max(map.rows, map.cols)));
  return (
    <div aria-hidden className="shrink-0">
      <MiniMap map={map} cell={cell} label="" />
    </div>
  );
}
