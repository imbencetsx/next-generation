"use client";

// A rajzolt térkép fölötti vezérlők: ecsetválasztó, méret (1–15) és a robot kezdőiránya.

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useI18n } from "@/i18n/i18n-provider";
import { MAX_MAP_SIZE } from "@/lib/limits";
import { isValidMapSize, MAP_TOOLS, resizeMap, type MapTool } from "@/lib/map-editor";
import type { Direction, GameMap } from "@/lib/robot-map";
import { CellArtwork } from "./map-grid";

type Props = {
  map: GameMap;
  disabled: boolean;
  tool: MapTool;
  onTool: (tool: MapTool) => void;
  onChange: (map: GameMap) => void;
};

export default function MapControls({ map, disabled, tool, onTool, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 border-b border-border p-3">
      <fieldset disabled={disabled} className="flex flex-wrap gap-2" aria-label={t.mapEditor.tools}>
        {MAP_TOOLS.map((kind) => (
          <Button key={kind} variant="outline" size="sm" aria-pressed={kind === tool} onClick={() => onTool(kind)}>
            <span className="block size-6 shrink-0">
              <CellArtwork kind={kind} direction={map.robot.dir} />
            </span>
            {t.mapEditor.toolNames[kind]}
          </Button>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <DimensionsForm key={`${map.rows}:${map.cols}`} map={map} disabled={disabled} onChange={onChange} />
        <div className="space-y-1">
          <Label htmlFor="map-direction">{t.mapEditor.robotDirection}</Label>
          <NativeSelect
            id="map-direction"
            disabled={disabled}
            value={map.robot.dir}
            onChange={(event) =>
              onChange({ ...map, robot: { ...map.robot, dir: Number(event.target.value) as Direction } })
            }
          >
            {t.sim.directions.map((name, dir) => (
              <NativeSelectOption key={dir} value={dir}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <p className="font-read text-xs text-muted-foreground">{t.mapEditor.resizeHint}</p>
    </div>
  );
}

function DimensionsForm({ map, disabled, onChange }: Pick<Props, "map" | "disabled" | "onChange">) {
  const { t } = useI18n();
  const [invalid, setInvalid] = useState(false);
  function resize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const rows = Number(values.get("rows"));
    const cols = Number(values.get("cols"));
    if (!isValidMapSize(rows) || !isValidMapSize(cols)) {
      return setInvalid(true);
    }
    setInvalid(false);
    onChange(resizeMap(map, rows, cols));
  }
  return (
    <form onSubmit={resize}>
      <fieldset disabled={disabled} className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="map-rows">{t.mapEditor.rows}</Label>
          <Input
            id="map-rows"
            className="w-16"
            type="number"
            name="rows"
            min={1}
            max={MAX_MAP_SIZE}
            step={1}
            defaultValue={map.rows}
            required
            aria-describedby="map-dimensions-hint"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="map-cols">{t.mapEditor.cols}</Label>
          <Input
            id="map-cols"
            className="w-16"
            type="number"
            name="cols"
            min={1}
            max={MAX_MAP_SIZE}
            step={1}
            defaultValue={map.cols}
            required
            aria-describedby="map-dimensions-hint"
          />
        </div>
        <Button type="submit" variant="outline">
          {t.mapEditor.resize}
        </Button>
      </fieldset>
      <p
        id="map-dimensions-hint"
        className={invalid ? "font-read text-xs text-brick-text" : "sr-only"}
        role={invalid ? "alert" : undefined}
      >
        {t.mapEditor.dimensionsHint}
      </p>
    </form>
  );
}
