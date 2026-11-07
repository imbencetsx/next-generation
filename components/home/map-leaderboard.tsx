"use client";

// Egy közzétett térkép ranglistájának eleje a térképkártyán (kiírás 3.5): a legjobb 5 játékos helyezése,
// neve, aranya és lépésszáma. A saját sor ki van emelve (szöveggel is, nem csak színnel).

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";

export default function MapLeaderboard({ mapId, mapName }: { mapId: Id<"maps">; mapName: string }) {
  const { t } = useI18n();
  const rows = useQuery(api.results.leaderboard, { mapId });
  const captionId = `leaderboard-${mapId}`;

  return (
    <div className="space-y-1.5">
      <h4 id={captionId} className="font-pixel text-sm">
        {t.home.leaderboard}
      </h4>
      {rows === undefined ? (
        <p className="font-read text-xs text-muted-foreground">{t.home.loading}</p>
      ) : rows.length === 0 ? (
        <p className="font-read text-xs text-muted-foreground">{t.home.leaderboardEmpty}</p>
      ) : (
        <table className="w-full font-mono text-xs" aria-labelledby={captionId} aria-describedby={`${captionId}-map`}>
          <caption id={`${captionId}-map`} className="sr-only">
            {mapName}
          </caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="w-6 pb-1 text-left font-normal">
                {t.home.place}
              </th>
              <th scope="col" className="pb-1 text-left font-normal">
                {t.home.player}
              </th>
              <th scope="col" className="pb-1 text-right font-normal">
                {t.home.goldColumn}
              </th>
              <th scope="col" className="pb-1 text-right font-normal">
                {t.home.steps}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className={row.isMe ? "bg-accent" : undefined}>
                <td className="py-0.5">{row.place}.</td>
                <td className="max-w-0 truncate py-0.5">
                  {row.name}
                  {row.isMe && <span className="text-muted-foreground"> ({t.home.you})</span>}
                </td>
                <td className="py-0.5 text-right">{row.gold}</td>
                <td className="py-0.5 text-right">{row.steps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
