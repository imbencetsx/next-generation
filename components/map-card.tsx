"use client";

// Közös kártyakép a közzétett térképekhez és a közzététel előnézetéhez. A térkép képe teljesen áll: nincs mozgás,
// csillogás vagy emelkedés, hogy a pixelek élesek és nyugodtak maradjanak.
import { useId, type CSSProperties, type ReactNode } from "react";
import { MiniMap } from "@/components/docs/mini-map";
import { useI18n } from "@/i18n/i18n-provider";
import { parseMap } from "@/lib/robot-map";

const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 216;
const MAX_PREVIEW_CELL = 40;

type Props = {
  name: string;
  text: string;
  author: string;
  publishedAt?: number;
  /** A cím mellett álló címke (pl. a beépített pálya nehézsége). */
  badge?: ReactNode;
  children?: ReactNode;
};

export default function MapCard({ name, text, author, publishedAt, badge, children }: Props) {
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
      {/* Rácsban (sm-től) minden kártya előnézete egyforma magas, hogy a címek egy vonalba essenek; telefonon egy
          oszlop van, ott a kép a saját magasságát kapja. */}
      <div
        className="flex items-end justify-center sm:h-(--preview-height)"
        style={{ "--preview-height": `${PREVIEW_HEIGHT + 8}px` } as CSSProperties}
      >
        <MiniMap map={map} cell={cell} label={t.home.preview(name, map.rows, map.cols)} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 id={titleId} className="truncate font-pixel text-lg" title={name}>
            {name}
          </h3>
          {badge}
        </div>
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
