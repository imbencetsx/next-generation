"use client";

// A beépített pályák (lib/robot-map.ts, MAP_PRESETS) kártyái: a térkép képe, a lefordított neve, a nehézsége, és
// két művelet: program írása rá a munkafelületen (ott a választóban is ez lesz kiválasztva), vagy egy másolata a
// térképszerkesztőben. A kezdőlap az első néhányat mutatja, a /maps/built-in oldal mindet.

import Link from "next/link";
import MapCard from "@/components/map-card";
import { Code, Pencil } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { MAP_PRESETS } from "@/lib/robot-map";
import { ROUTES, withMap } from "@/lib/routes";

type Preset = (typeof MAP_PRESETS)[number];

const DIFFICULTY_ORDER: Record<Preset["difficulty"], number> = { easy: 0, medium: 1, hard: 2 };
/** A könnyűtől a nehézig; azonos nehézségen belül a MAP_PRESETS sorrendjében (a rendezés stabil). */
const BY_DIFFICULTY = [...MAP_PRESETS].sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);

/** @param limit Legfeljebb ennyi pálya (a kezdőlapon, a legkönnyebbek); nélküle mind. */
export default function BuiltInMaps({ limit }: { limit?: number }) {
  const presets = limit === undefined ? BY_DIFFICULTY : BY_DIFFICULTY.slice(0, limit);
  return (
    <ul aria-labelledby="built-in-title" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {presets.map((preset) => (
        <li key={preset.name} className="flex">
          <BuiltInMap preset={preset} />
        </li>
      ))}
    </ul>
  );
}

function BuiltInMap({ preset }: { preset: Preset }) {
  const { t } = useI18n();
  const name = t.sim.maps[preset.name] ?? preset.name;
  const difficulty = t.home.difficulty[preset.difficulty];
  return (
    <MapCard
      name={name}
      text={preset.text}
      author={t.home.builtInAuthor}
      badge={
        <Badge variant="outline" title={t.home.difficultyLabel(difficulty)} data-difficulty={preset.difficulty}>
          <span className="sr-only">{t.home.difficultyLabel(difficulty)}</span>
          <span aria-hidden>{difficulty}</span>
        </Badge>
      }
    >
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={withMap(ROUTES.workbench, preset.text, name)}
          data-slot="button"
          data-variant="default"
          className={buttonVariants()}
        >
          <Code aria-hidden />
          {t.home.program}
        </Link>
        <Link
          href={withMap(ROUTES.mapEditor, preset.text, name)}
          data-slot="button"
          data-variant="outline"
          className={buttonVariants({ variant: "outline" })}
        >
          <Pencil aria-hidden />
          {t.home.editCopy}
        </Link>
      </div>
    </MapCard>
  );
}
