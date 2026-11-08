"use client";

// A jobb oldali panel: a futási hiba, a térképválasztás és -import, a köd kapcsolója, a statisztika és maga a térkép.
// A futás vezérlői a szerkesztő fejlécében vannak (playback-bar.tsx).

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Alert, Compass, Fog, Upload } from "@/components/icons";
import PixelMap from "@/components/pixel-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Simulation } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import { localizedMapError } from "@/i18n/map-errors";
import { MAX_LINES } from "@/lib/interpreter";
import { MAP_PRESETS } from "@/lib/robot-map";

type Props = {
  simulation: Simulation;
  /** A térkép alatt megjelenő kiegészítés (pl. közzétett térképen a rögzített eredmény). */
  footer?: ReactNode;
};

export default function Simulator({ simulation, footer }: Props) {
  const { t, locale } = useI18n();
  const { snapshot, map } = simulation;
  const [fog, setFog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const totalGold = map.gold.filter(Boolean).length;
  const direction = t.sim.directions[snapshot.robot.dir];

  function importMap(event: ChangeEvent<HTMLInputElement>) {
    simulation.importMap(event.target.files?.[0]);
    event.target.value = "";
  }

  const presetNames = MAP_PRESETS.map((preset) => preset.name);
  const isPreset = simulation.presetName !== null;
  // A beépített térképek nevét lefordítjuk; az importált fájl neve marad.
  const mapLabel = (name: string) => t.sim.maps[name] ?? name;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {simulation.mapError && (
        <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text">
          <Alert size={14} aria-hidden /> {localizedMapError(simulation.mapError, locale)}
        </p>
      )}

      <Card role="region" aria-label={t.sim.map} className="relative min-h-0 flex-1 gap-0 py-0">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
          <label className="sr-only" htmlFor="map-select">
            {t.sim.map}
          </label>
          <NativeSelect
            id="map-select"
            value={simulation.presetName ?? "custom"}
            disabled={simulation.locked}
            onChange={(event) => simulation.selectMap(event.target.value)}
          >
            {/* Importált vagy megosztott térkép: a neve megjelenik, de újra kiválasztani nem lehet. */}
            {!isPreset && (
              <NativeSelectOption value="custom" disabled>
                {simulation.defaultMapName ? t.sim.maps["Shared map"] : simulation.mapName}
              </NativeSelectOption>
            )}
            {presetNames.map((name) => (
              <NativeSelectOption key={name} value={name}>
                {mapLabel(name)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button variant="ghost" disabled={simulation.locked} onClick={() => fileInput.current?.click()}>
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
          <Button variant="outline" aria-pressed={fog} onClick={() => setFog((value) => !value)}>
            <Fog aria-hidden /> {t.sim.fog}
          </Button>
          <dl className="ml-auto flex items-baseline gap-5 px-1">
            <Stat label={t.sim.gold} value={`${snapshot.mined}/${totalGold}`} />
            <Stat label={t.sim.lines} value={`${snapshot.steps}`} suffix={`/${MAX_LINES}`} />
          </dl>
        </div>
        <div className="min-h-0 flex-1 bg-[#0f0a09] p-3">
          <PixelMap
            map={map}
            robot={snapshot.robot}
            explored={snapshot.explored}
            gold={snapshot.gold}
            fog={fog}
            motion={simulation.motion}
            lit={snapshot.status !== "running"}
            label={t.sim.mapLabel(map.rows, map.cols, snapshot.robot.y + 1, snapshot.robot.x + 1, direction)}
          />
        </div>
        <p className="flex items-center justify-center gap-2 border-t border-border px-3 py-1.5 text-center font-read text-[13px] text-muted-foreground">
          <Compass size={13} aria-hidden />
          {t.sim.facing(direction)} {fog ? t.sim.fogCaption : t.sim.exploredCaption}
        </p>
        {footer}
      </Card>
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
