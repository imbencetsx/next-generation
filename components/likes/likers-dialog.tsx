"use client";

// A saját térkép kártyáján: ikongomb, ami párbeszédablakban mutatja, kik kedvelték a térképet.

import { useId } from "react";
import { Users } from "@/components/icons";
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
import LikersList from "./likers-list";

type Props = { mapId: Id<"maps">; mapName: string; total: number };

export default function LikersDialog({ mapId, mapName, total }: Props) {
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle id={titleId}>{t.home.likersOf(mapName)}</AlertDialogTitle>
        </AlertDialogHeader>
        <LikersList mapId={mapId} total={total} labelledBy={titleId} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t.home.close}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
