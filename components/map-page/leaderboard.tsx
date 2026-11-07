"use client";

// Egy közzétett térkép ranglistája táblázatként (kiírás 3.5): helyezés, játékos, arany és lépésszám.
// Előrébb a több arany, azon belül a kevesebb lépés; az egyforma eredmény ugyanazt a helyezést kapja.
// Az első három hely érmet kap; a saját sor ki van emelve (szöveggel is, nem csak színnel).

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";
import Medal, { MEDAL_PLACES } from "./medal";

type Props = {
  mapId: Id<"maps">;
  /** A táblázatot megnevező cím azonosítója (a lapon lévő címsor). */
  labelledBy: string;
};

export default function MapLeaderboard({ mapId, labelledBy }: Props) {
  const { t } = useI18n();
  const rows = useQuery(api.results.leaderboard, { mapId });

  if (rows === undefined) return <p className="font-read text-sm text-muted-foreground">{t.home.loading}</p>;
  if (rows.length === 0) return <p className="font-read text-muted-foreground">{t.home.leaderboardEmpty}</p>;

  return (
    <table
      className="w-full border-separate border-spacing-x-0 border-spacing-y-1 font-read tabular-nums"
      aria-labelledby={labelledBy}
    >
      <thead className="text-sm text-muted-foreground">
        <tr>
          <th scope="col" className="w-16 px-3 py-2 text-left font-normal">
            {t.home.place}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-normal">
            {t.home.player}
          </th>
          <th scope="col" className="w-20 px-3 py-2 text-right font-normal">
            {t.home.goldColumn}
          </th>
          <th scope="col" className="w-20 px-3 py-2 text-right font-normal">
            {t.home.steps}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          // A saját sor kiemelése a cellák hátterén van (a sor maga nem rajzol hátteret minden böngészőben
          // egyformán); a cellák belső margója miatt a kiemelés körbeveszi a szöveget, nem ér hozzá.
          <tr key={index} className={row.isMe ? "[&>td]:bg-accent" : undefined}>
            <td className="h-12 px-3 align-middle">
              {row.place <= MEDAL_PLACES ? (
                <>
                  <Medal place={row.place} />
                  <span className="sr-only">{row.place}.</span>
                </>
              ) : (
                <span className="pl-1.5">{row.place}.</span>
              )}
            </td>
            <td className="max-w-0 truncate px-3 align-middle">
              {row.name}
              {row.isMe && <span className="text-muted-foreground"> ({t.home.you})</span>}
            </td>
            <td className="px-3 text-right align-middle">{row.gold}</td>
            <td className="px-3 text-right align-middle">{row.steps}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
