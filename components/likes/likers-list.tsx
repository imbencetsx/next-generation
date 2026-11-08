"use client";

// A saját térkép kedvelői, a legújabb elöl. A névsort csak a szerző kapja meg a szervertől (likes.likers).
// Minden kedvelő egy pixeles keretű sor: profilkép (vagy a neve kezdőbetűje), név, a sajátnál „te” címke, és mikor
// kedvelte. A sorok egymás után érkeznek; üres listánál a robot áll ott egyedül.

import RobotSprite from "@/components/robot-sprite";
import { useQuery } from "convex/react";
import Avatar from "@/components/auth/avatar";
import { HeartFilled } from "@/components/icons";
import { robotSpriteStyle } from "@/components/sprites";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";

type Props = { mapId: Id<"maps">; total: number; labelledBy?: string };

/** A profilkép mérete a sorban (a pixeles kör 32-es rácsán egész szorzó, így éles). */
const AVATAR_SIZE = 40;
/** Két egymás utáni sor érkezése között eltelt idő. */
const ROW_STAGGER_MS = 60;
/** Betöltés közben ennyi üres helyőrző sor látszik. */
const PLACEHOLDER_ROWS = 3;
/** Dél felé (a néző felé) néz, DIRECTIONS sorrendjében a 2. */
const FACING_VIEWER = 2;

export default function LikersList({ mapId, total, labelledBy }: Props) {
  const { t, locale } = useI18n();
  const likers = useQuery(api.likes.likers, { mapId });

  if (likers === undefined) return <Placeholder label={t.home.loading} />;
  if (likers === null || likers.length === 0) return <Empty text={t.home.likersEmpty} />;

  const hidden = total - likers.length;
  return (
    <div className="space-y-3">
      <ul aria-labelledby={labelledBy} className="-mx-1 max-h-80 space-y-2 overflow-y-auto px-1 py-1">
        {likers.map((liker, index) => {
          const likedAt = new Date(liker.likedAt);
          return (
            // A lista a lekérdezés sorrendjét követi; egy névhez több kedvelés is tartozhat (törölt fiók).
            <li
              key={index}
              className="liker-row pixel-frame map-entry-enter flex items-center gap-3 px-3 py-2.5"
              style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}
            >
              <Avatar name={liker.name} imageUrl={liker.imageUrl} size={AVATAR_SIZE} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex items-center gap-2 font-pixel">
                  <span className="truncate">{liker.name}</span>
                  {liker.isMe && <Badge variant="outline">{t.home.you}</Badge>}
                </p>
                <time dateTime={likedAt.toISOString()} className="block font-read text-xs text-muted-foreground">
                  {likedAt.toLocaleDateString(locale)}
                </time>
              </div>
              <HeartFilled size={16} aria-hidden className="liker-heart shrink-0" />
            </li>
          );
        })}
      </ul>
      {hidden > 0 && <p className="font-read text-sm text-muted-foreground">{t.home.likersMore(hidden)}</p>}
    </div>
  );
}

/** Betöltés: üres, lassan lüktető sorok a végleges sorok helyén, hogy a párbeszédablak ne ugorjon. */
function Placeholder({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <div key={index} aria-hidden className="liker-placeholder pixel-frame flex items-center gap-3 px-3 py-2.5">
          <span className="size-10 shrink-0 bg-muted" />
          <span className="h-3 w-32 bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** Még senki: a robot egyedül áll, alatta a szöveg. */
function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <RobotSprite aria-hidden className="likers-empty-robot size-16" style={robotSpriteStyle(FACING_VIEWER)} />
      <p className="max-w-[28ch] font-read text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
