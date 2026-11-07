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
import { MAX_LINES, type RunError } from "@/lib/interpreter";
import { MAP_PRESETS } from "@/lib/robot-map";

type Props = {
  simulation: Simulation;
  onJump: (line: number, column?: number) => void;
  /** A térkép alatt megjelenő kiegészítés (pl. közzétett térképen a rögzített eredmény). */
  footer?: ReactNode;
};

export default function Simulator({ simulation, onJump, footer }: Props) {
  const { t } = useI18n();
  const { snapshot, map } = simulation;
  const [fog, setFog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const totalGold = map.gold.filter(Boolean).length;
  const direction = t.sim.directions[snapshot.robot.dir];
  const error = snapshot.error;

  function importMap(event: ChangeEvent<HTMLInputElement>) {
    simulation.importMap(event.target.files?.[0]);
    event.target.value = "";
  }

  const presetNames = MAP_PRESETS.map((preset) => preset.name);
  const isPreset = presetNames.includes(simulation.mapName);
  // A beépített térképek nevét lefordítjuk; az importált fájl neve marad.
  const mapLabel = (name: string) => t.sim.maps[name] ?? name;

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-3 lg:min-h-0">
      {simulation.mapError && (
        <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text">
          <Alert size={14} aria-hidden /> {simulation.mapError}
        </p>
      )}

      {error && <RunErrorBox error={error} onJump={onJump} />}

      <Card role="region" aria-label={t.sim.map} className="relative min-h-0 flex-1 gap-0 py-0">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
          <label className="sr-only" htmlFor="map-select">
            {t.sim.map}
          </label>
          <NativeSelect
            id="map-select"
            value={simulation.mapName}
            disabled={simulation.locked}
            onChange={(event) => simulation.selectMap(event.target.value)}
          >
            {/* Importált vagy megosztott térkép: a neve megjelenik, de újra kiválasztani nem lehet. */}
            {!isPreset && (
              <NativeSelectOption value={simulation.mapName} disabled>
                {mapLabel(simulation.mapName)}
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

/** A futásidejű hiba: kód és hely, üzenet, javaslat, valamint ugrás a hibás és a kapcsolódó sorokra. */
function RunErrorBox({ error, onJump }: { error: RunError; onJump: Props["onJump"] }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="pixel-frame bg-brick/15 p-3 text-sm" data-tone="danger">
      <p className="flex items-center gap-2 font-mono text-xs text-brick-text">
        <Alert size={14} aria-hidden />
        {t.sim.errorAt(error.code, error.line, error.column)}
      </p>
      <p className="mt-1 font-read">{error.message}</p>
      {error.hint && (
        <p className="mt-1 whitespace-pre-line font-read text-[13px] text-muted-foreground">
          <span className="text-foreground">{t.editor.hint}</span> {error.hint}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-x-3">
        <button
          type="button"
          className="text-xs underline underline-offset-4"
          onClick={() => onJump(error.line, error.column)}
        >
          {t.sim.goToLine(error.line)}
        </button>
        {error.related?.map((item) => (
          <button
            type="button"
            key={item.line + item.message}
            className="text-xs underline underline-offset-4"
            onClick={() => onJump(item.line)}
          >
            {t.editor.relatedLine(item.line)} {item.message}
          </button>
        ))}
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
