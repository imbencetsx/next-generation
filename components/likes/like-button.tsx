"use client";

// Szív gomb egy közzétett térképhez: kedvelés be/ki, mellette a kedvelések száma. A kedvelt állapotot a
// kitöltött szív és a lenyomott (világos keretes) gomb is jelzi, a képernyőolvasónak az aria-pressed.

import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, Heart, HeartFilled } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/i18n/i18n-provider";

type Props = {
  mapId: Id<"maps">;
  mapName: string;
  liked: boolean;
  count: number;
  size?: React.ComponentProps<typeof Button>["size"];
};

export default function LikeButton({ mapId, mapName, liked, count, size }: Props) {
  const { t } = useI18n();
  const toggle = useMutation(api.likes.toggle);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    try {
      // A szám és az állapot a lekérdezés frissülésével jön vissza.
      await toggle({ mapId });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  const Icon = liked ? HeartFilled : Heart;
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant="outline"
        size={size}
        aria-pressed={liked}
        aria-label={`${t.home.like(mapName)}, ${t.home.likeCount(count)}`}
        title={t.home.like(mapName)}
        disabled={pending}
        onClick={() => void onClick()}
        className="tabular-nums"
      >
        <Icon aria-hidden />
        {count}
      </Button>
      {failed && (
        <span role="alert" className="flex items-center gap-1 font-read text-xs text-brick-text">
          <Alert size={12} aria-hidden />
          {t.home.likeFailed}
        </span>
      )}
    </span>
  );
}
