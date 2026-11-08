"use client";

// A saját térkép kedvelői, a legújabb elöl. A névsort csak a szerző kapja meg a szervertől (likes.likers).

import { useQuery } from "convex/react";
import { User } from "@/components/icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";

type Props = { mapId: Id<"maps">; total: number; labelledBy?: string };

export default function LikersList({ mapId, total, labelledBy }: Props) {
  const { t, locale } = useI18n();
  const likers = useQuery(api.likes.likers, { mapId });

  if (likers === undefined) return <p className="font-read text-sm text-muted-foreground">{t.home.loading}</p>;
  if (likers === null || likers.length === 0) {
    return <p className="font-read text-sm text-muted-foreground">{t.home.likersEmpty}</p>;
  }

  const hidden = total - likers.length;
  return (
    <div className="space-y-2">
      <ul aria-labelledby={labelledBy} className="max-h-80 space-y-1 overflow-y-auto font-read">
        {likers.map((liker, index) => {
          const likedAt = new Date(liker.likedAt);
          return (
            <li key={index} className="flex items-center gap-2 py-1">
              <User size={16} aria-hidden className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {liker.name}
                {liker.isMe && <span className="text-muted-foreground"> ({t.home.you})</span>}
              </span>
              <time dateTime={likedAt.toISOString()} className="text-sm text-muted-foreground">
                {likedAt.toLocaleDateString(locale)}
              </time>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && <p className="font-read text-sm text-muted-foreground">{t.home.likersMore(hidden)}</p>}
    </div>
  );
}
