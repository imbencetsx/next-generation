"use client";

// A robot aktuális állapota, a térkép és a futás vezérlői.

import { useRef, useState, type ChangeEvent } from "react";
import { Activity, AlertCircle, CheckCircle2, Circle, CloudFog, Compass, Pause, Play, RotateCcw, SkipForward, Upload } from "lucide-react";
import PixelMap from "@/components/pixel-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SPEEDS, type Simulation } from "@/components/use-simulation";
import { MAP_PRESETS, DIRECTIONS } from "@/lib/robot-map";

function statusLabel(simulation: Simulation) {
  const { status, steps } = simulation.snapshot;
  if (status === "running") {
    if (simulation.playing) return "Running";
    return steps > 0 ? "Paused" : "Ready";
  }
  return { idle: "Ready", done: "Finished", error: "Error" }[status];
}

type Props = {
  simulation: Simulation;
  onJump: (line: number, column?: number) => void;
  firstIssue: { line: number; column: number } | null;
};

export default function Simulator({ simulation, onJump, firstIssue }: Props) {
  const { snapshot, map } = simulation;
  const [fog, setFog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const finished = snapshot.status === "done" || snapshot.status === "error";
  const totalGold = map.gold.filter(Boolean).length;
  const direction = DIRECTIONS[snapshot.robot.dir].name;
  const error = snapshot.error;
  let runLabel = "Run";
  if (finished) runLabel = "Run again";
  else if (simulation.started) runLabel = "Resume";

  function start(action: () => void) {
    if (firstIssue) onJump(firstIssue.line, firstIssue.column);
    action();
  }

  function runProgram() {
    start(simulation.run);
  }

  function stepProgram() {
    start(simulation.step);
  }

  function importMap(event: ChangeEvent<HTMLInputElement>) {
    simulation.importMap(event.target.files?.[0]);
    event.target.value = "";
  }

  const status = statusLabel(simulation);
  const StatusIcon = snapshot.status === "error" ? AlertCircle : snapshot.status === "done" ? CheckCircle2 : simulation.playing ? Activity : Circle;
  const presetNames = MAP_PRESETS.map((preset) => preset.name);

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-3 lg:min-h-0">
      <Card role="region" aria-label="Playback" className="flex-row flex-wrap items-center gap-1.5 p-2">
        {simulation.playing ? (
          <Button variant="outline" onClick={simulation.pause}><Pause aria-hidden /> Pause</Button>
        ) : (
          <Button onClick={runProgram}>
            <Play aria-hidden /> {runLabel}
          </Button>
        )}
        <Button variant="outline" onClick={stepProgram} disabled={simulation.playing}><SkipForward aria-hidden /> Step</Button>
        <Button variant="outline" onClick={simulation.reset} disabled={!simulation.started}><RotateCcw aria-hidden /> Reset</Button>
        <label className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
          Speed
          <NativeSelect value={simulation.speed} onChange={(event) => simulation.setSpeed(Number(event.target.value))}>
            {SPEEDS.map((speed, index) => <NativeSelectOption key={speed.label} value={index}>{speed.label}</NativeSelectOption>)}
          </NativeSelect>
        </label>
        <p role="status" className={`ml-auto flex items-center gap-1.5 px-1 text-sm ${snapshot.status === "error" ? "text-brick-text" : "text-foreground"}`}>
          <StatusIcon size={15} aria-hidden /> {status}
        </p>
      </Card>
      {simulation.notice && <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text"><AlertCircle size={14} aria-hidden /> {simulation.notice}</p>}
      {simulation.mapError && <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text"><AlertCircle size={14} aria-hidden /> {simulation.mapError}</p>}

      {error && (
        <div role="alert" className="pixel-frame bg-brick/15 p-3 text-sm" data-tone="danger">
          <p className="flex items-center gap-2 font-mono text-xs text-brick-text">
            <AlertCircle size={14} aria-hidden />
            {error.code} on line {error.line}, column {error.column}
          </p>
          <p className="mt-1 font-read">{error.message}</p>
          {error.hint && <p className="mt-1 whitespace-pre-line font-read text-[13px] text-muted-foreground"><span className="text-foreground">Hint:</span> {error.hint}</p>}
          <div className="mt-1.5 flex flex-wrap gap-x-3">
            <button className="text-xs underline underline-offset-4" onClick={() => onJump(error.line, error.column)}>
              Go to line {error.line}
            </button>
            {error.related?.map((item) => (
              <button key={item.line + item.message} className="text-xs underline underline-offset-4" onClick={() => onJump(item.line)}>
                Line {item.line}: {item.message}
              </button>
            ))}
          </div>
        </div>
      )}

      <Card role="region" aria-label="Map" className="relative min-h-0 flex-1 gap-0 py-0">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
          <label className="sr-only" htmlFor="map-select">Map</label>
          <NativeSelect
            id="map-select" value={simulation.mapName} disabled={simulation.locked}
            onChange={(event) => simulation.selectMap(event.target.value)}
          >
            {!presetNames.includes(simulation.mapName) && <NativeSelectOption value={simulation.mapName} disabled>{simulation.mapName}</NativeSelectOption>}
            {presetNames.map((name) => <NativeSelectOption key={name} value={name}>{name}</NativeSelectOption>)}
          </NativeSelect>
          <Button variant="ghost" disabled={simulation.locked} onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden /> Import
          </Button>
          <input
            ref={fileInput} type="file" accept=".txt,.map,text/plain" hidden
            onChange={importMap}
          />
          <Button variant="outline" aria-pressed={fog} onClick={() => setFog((value) => !value)}>
            <CloudFog aria-hidden /> Fog
          </Button>
          <dl className="ml-auto flex items-baseline gap-5 px-1">
            <Stat label="Gold" value={`${snapshot.mined}/${totalGold}`} />
            <Stat label="Lines" value={`${snapshot.steps}`} suffix="/1000" />
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
            label={`Map with ${map.rows} rows and ${map.cols} columns. Robot at row ${snapshot.robot.y + 1}, column ${snapshot.robot.x + 1}, facing ${direction}.`}
          />
        </div>
        <p className="flex items-center justify-center gap-2 border-t border-border px-3 py-1.5 text-center font-read text-[13px] text-muted-foreground">
          <Compass size={13} aria-hidden />
          Robot faces {direction}. {fog ? "Solid dirt hides everything unexplored." : "Dug-out dirt marks explored cells."}
        </p>
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
