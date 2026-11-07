"use client";

// Közzétett térképen a térkép alatt: a játékos legjobb eredménye (élőben frissül) és a legutóbbi rögzítés.

import { useQuery } from "convex/react";
import { Alert, Check } from "@/components/icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";
import type { RecordState } from "./use-result-recorder";

type Props = {
  mapId: string;
  /** A legutóbbi rögzítés; csak akkor látszik, ha ehhez a térképhez tartozik. */
  record: RecordState | null;
};

export default function PublishedMapResult({ mapId, record }: Props) {
  const { t } = useI18n();
  const best = useQuery(api.results.myBest, { mapId: mapId as Id<"maps"> });
  const latest = record?.mapId === mapId ? record : null;

  return (
    <div className="space-y-1 border-t border-border px-3 py-2 font-read text-[13px]">
      <p className="text-muted-foreground">{t.results.publishedMap}</p>
      {best !== undefined && <p>{best ? t.results.best(best.gold, best.steps) : t.results.noBest}</p>}
      <div role="status">
        {latest?.status === "saving" && <p className="text-muted-foreground">{t.results.saving}</p>}
        {latest?.status === "saved" && (
          <p className="flex items-center gap-2">
            <Check size={16} aria-hidden />
            {latest.improved
              ? t.results.improved(latest.gold, latest.steps)
              : t.results.notImproved(latest.gold, latest.steps)}
          </p>
        )}
      </div>
      {latest?.status === "error" && (
        <p role="alert" className="flex items-center gap-2 text-brick-text">
          <Alert size={16} aria-hidden />
          {t.results.errors[latest.error]}
        </p>
      )}
    </div>
  );
}
