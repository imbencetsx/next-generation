"use client";

// A jobb oldali panel: a térkép neve és importja, a köd kapcsolója, a statisztika és maga a térkép.
// A futás vezérlői a szerkesztő fejlécében vannak (playback-bar.tsx).

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { Alert, Compass, Fog, MapIcon, Trophy, Upload } from "@/components/icons";
import PixelMap from "@/components/pixel-map";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Simulation } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import { localizedMapError } from "@/i18n/map-errors";
import { MAX_LINES } from "@/lib/interpreter";
import { ROUTES } from "@/lib/routes";
import { decodeRobot } from "@/lib/scoring";

/** Az 1. helyezett futásának útja (convex/results.ts: ghost); a robot helye soronként, tömörítve. */
export type Ghost = { name: string; isMe: boolean; gold: number; steps: number; trace: number[] };

type Props = {
  simulation: Simulation;
  /** Közzétett térképen az 1. helyezett „szelleme”, ha van eredmény. */
  ghost?: Ghost | null;
  /** A térkép alatt megjelenő kiegészítés (pl. közzétett térképen a rögzített eredmény). */
  footer?: ReactNode;
};

export default function Simulator({ simulation, ghost = null, footer }: Props) {
  const { t, locale } = useI18n();
  const { snapshot, map } = simulation;
  const [fog, setFog] = useState(false);
  // A köd és a szellem alapból ki van kapcsolva; a játékos kapcsolja be, ha kéri.
  const [showGhost, setShowGhost] = useState(false);
  // A szellem ugyanannyi feldolgozott sornál jár, mint a játékos robotja (a ranglista lépésszáma szerint versenyeznek);
  // ha a szellem futása már véget ért, az utolsó helyén áll. Futás előtt nem látszik.
  const ghostRobot =
    ghost && showGhost && simulation.started
      ? decodeRobot(ghost.trace[Math.min(snapshot.steps, ghost.trace.length - 1)], map.cols)
      : null;
  const fileInput = useRef<HTMLInputElement>(null);
  const totalGold = map.gold.filter(Boolean).length;
  const direction = t.sim.directions[snapshot.robot.dir];

  function importMap(event: ChangeEvent<HTMLInputElement>) {
    simulation.importMap(event.target.files?.[0]);
    event.target.value = "";
  }

  // A beépített térképek nevét lefordítjuk; az importált fájl neve marad.
  const mapLabel = simulation.presetName
    ? (t.sim.maps[simulation.presetName] ?? simulation.mapName)
    : simulation.defaultMapName
      ? t.sim.maps["Shared map"]
      : simulation.mapName;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {simulation.mapError && (
        <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text">
          <Alert size={14} aria-hidden /> {localizedMapError(simulation.mapError, locale)}
        </p>
      )}

      <Card role="region" aria-label={t.sim.map} className="relative min-h-0 flex-1 gap-0 py-0">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
          <span className="min-w-0 max-w-48 truncate px-2 font-read text-sm" title={mapLabel}>
            {simulation.hasMap ? mapLabel : t.sim.map}
          </span>
          <Button
            variant={simulation.hasMap ? "ghost" : "default"}
            disabled={simulation.locked}
            onClick={() => fileInput.current?.click()}
          >
            <Upload aria-hidden /> {t.sim.importMap}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.map,text/plain"
            hidden
            aria-label={t.sim.importMap}
            onChange={importMap}
          />
          {ghost && (
            <Button variant="outline" aria-pressed={showGhost} onClick={() => setShowGhost((value) => !value)}>
              <Trophy aria-hidden /> {t.sim.ghost}
            </Button>
          )}
          {simulation.hasMap && (
            <dl className="ml-auto flex items-baseline gap-5 px-1">
              <Stat label={t.sim.gold} value={`${snapshot.mined}/${totalGold}`} />
              <Stat label={t.sim.lines} value={`${snapshot.steps}`} suffix={`/${MAX_LINES}`} />
            </dl>
          )}
          {simulation.hasMap && (
            <Button variant="outline" aria-pressed={fog} onClick={() => setFog((value) => !value)}>
              <Fog aria-hidden /> {t.sim.fog}
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 bg-[#0f0a09] p-3">
          {simulation.hasMap ? (
            <PixelMap
              map={map}
              robot={snapshot.robot}
              explored={snapshot.explored}
              gold={snapshot.gold}
              fog={fog}
              motion={simulation.motion}
              lit={snapshot.status !== "running"}
              ghost={ghostRobot && { robot: ghostRobot, label: t.sim.ghostLabel }}
              label={t.sim.mapLabel(map.rows, map.cols, snapshot.robot.y + 1, snapshot.robot.x + 1, direction)}
            />
          ) : (
            <EmptyMap />
          )}
        </div>
        {simulation.hasMap && (
          <p className="flex items-center justify-center gap-2 border-t border-border px-3 py-1.5 text-center font-read text-[13px] text-muted-foreground">
            <Compass size={13} aria-hidden />
            {t.sim.facing(direction)} {fog ? t.sim.fogCaption : t.sim.exploredCaption}
          </p>
        )}
        {ghost && showGhost && (
          <p className="flex items-center justify-center gap-2 border-t border-border px-3 py-1.5 text-center font-read text-[13px] text-muted-foreground">
            <Trophy size={12} aria-hidden />
            {t.sim.ghostCaption(ghost.isMe ? t.home.you : ghost.name, ghost.gold, ghost.steps)}
          </p>
        )}
        {footer}
      </Card>
    </div>
  );
}

function EmptyMap() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-3 py-6 text-center">
      <MapIcon size={48} className="text-muted-foreground" aria-hidden />
      <h2 className="panel-title">{t.sim.noMapTitle}</h2>
      <p className="max-w-sm font-read text-sm text-muted-foreground">{t.sim.noMapHint}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={ROUTES.builtInMaps}
          data-slot="button"
          data-variant="outline"
          className={buttonVariants({ variant: "outline" })}
        >
          {t.home.allBuiltIn}
        </Link>
        <Link
          href={ROUTES.maps}
          data-slot="button"
          data-variant="outline"
          className={buttonVariants({ variant: "outline" })}
        >
          {t.home.allPublished}
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="display text-xl text-foreground">
        {value}
        {suffix && <span className="font-pixel text-xs text-muted-foreground">{suffix}</span>}
      </dd>
    </div>
  );
}
