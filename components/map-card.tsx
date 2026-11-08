"use client";

// Közös kártyakép a közzétett térképekhez és a közzététel előnézetéhez.
import { useId, type ReactNode } from "react";
import { MiniMap } from "@/components/docs/mini-map";
import { useI18n } from "@/i18n/i18n-provider";
import { parseMap } from "@/lib/robot-map";

const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 216;
const MAX_PREVIEW_CELL = 40;

type Props = { name: string; text: string; author: string; publishedAt?: number; children?: ReactNode };

export default function MapCard({ name, text, author, publishedAt, children }: Props) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const parsed = parseMap(text);
  if (!parsed.ok) return null;
  const { map } = parsed;
  const goldCount = map.gold.filter(Boolean).length;
  const cell = Math.min(MAX_PREVIEW_CELL, Math.floor(Math.min(PREVIEW_WIDTH / map.cols, PREVIEW_HEIGHT / map.rows)));
  const published = publishedAt === undefined ? null : new Date(publishedAt);

  return (
    <article className="pixel-frame flex w-full flex-col gap-4 p-5" aria-labelledby={titleId}>
      <div className="flex items-end justify-center" style={{ height: PREVIEW_HEIGHT + 8 }}>
        <MiniMap map={map} cell={cell} label={t.home.preview(name, map.rows, map.cols)} shine />
      </div>
      <div className="space-y-1">
        <h3 id={titleId} className="truncate font-pixel text-lg" title={name}>
          {name}
        </h3>
        <p className="font-read text-sm text-muted-foreground">
          {t.home.by(author)}
          {published && (
            <>
              , <time dateTime={published.toISOString()}>{published.toLocaleDateString(locale)}</time>
            </>
          )}
        </p>
        <p className="font-read text-sm text-muted-foreground">{t.home.details(map.rows, map.cols, goldCount)}</p>
      </div>
      {children}
    </article>
  );
}
