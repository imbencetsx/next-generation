"use client";

// A robot aktuális állapota, a térkép és a futás vezérlői.

import { useRef, useState, type ChangeEvent } from "react";
import { Pause, Play, RotateCcw, SkipForward, Upload } from "lucide-react";
import PixelMap from "@/components/pixel-map";
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

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-2 lg:min-h-0">
      <section className="flex flex-wrap items-center gap-2 rounded-lg border border-[#dfe4ec] bg-white p-2" aria-label="Playback controls">
        {simulation.playing ? (
          <button className="btn" onClick={simulation.pause}><Pause size={16} aria-hidden /> Pause</button>
        ) : (
          <button className="btn btn-primary" onClick={runProgram}>
            <Play size={16} aria-hidden /> {runLabel}
          </button>
        )}
        <button className="btn" onClick={stepProgram} disabled={simulation.playing}><SkipForward size={16} aria-hidden /> Step</button>
        <button className="btn" onClick={simulation.reset} disabled={!simulation.started}><RotateCcw size={16} aria-hidden /> Reset</button>
        <label className="flex items-center gap-2 text-xs text-[#65738a]">
          Speed
          <select className="btn" value={simulation.speed} onChange={(event) => simulation.setSpeed(Number(event.target.value))}>
            {SPEEDS.map((speed, index) => <option key={speed.label} value={index}>{speed.label}</option>)}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="map-select">Choose map</label>
          <select
            id="map-select" className="btn" value="" disabled={simulation.locked}
            onChange={(event) => simulation.selectMap(event.target.value)}
          >
            <option value="" disabled>Load map…</option>
            {MAP_PRESETS.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
          </select>
          <button className="btn" disabled={simulation.locked} onClick={() => fileInput.current?.click()}>
            <Upload size={16} aria-hidden /> Import map
          </button>
          <input
            ref={fileInput} type="file" accept=".txt,.map,text/plain" hidden
            onChange={importMap}
          />
          <button className="btn" aria-pressed={fog} onClick={() => setFog((value) => !value)}>Fog</button>
        </div>
      </section>
      {simulation.notice && <p role="alert" className="text-sm text-[#c84848]">{simulation.notice}</p>}
      {simulation.mapError && <p role="alert" className="text-sm text-[#c84848]">{simulation.mapError}</p>}

      <section className="grid grid-cols-4 gap-2" aria-label="Run statistics">
        <Stat label="Map" value={simulation.mapName} />
        <Stat label="Gold mined" value={`${snapshot.mined} / ${totalGold}`} />
        <Stat label="Lines run" value={`${snapshot.steps} / 1000`} />
        <Stat label="Status" value={statusLabel(simulation)} tone={snapshot.status === "error" ? "error" : snapshot.status === "done" ? "ok" : undefined} />
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-[#efc2c2] bg-[#fdf0f0] p-3 text-sm">
          <p className="font-mono text-xs font-semibold text-[#c84848]">
            {error.code} · line {error.line}, column {error.column}
          </p>
          <p>{error.message}</p>
          {error.hint && <p className="mt-1 whitespace-pre-line text-xs text-[#65738a]"><span className="font-semibold">Hint:</span> {error.hint}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3">
            <button className="text-xs text-[#4666ce] underline" onClick={() => onJump(error.line, error.column)}>
              Go to line {error.line}
            </button>
            {error.related?.map((item) => (
              <button key={item.line + item.message} className="text-xs text-[#4666ce] underline" onClick={() => onJump(item.line)}>
                Line {item.line}: {item.message}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#2c1c19] bg-[#170c0a]" aria-label="Map">
        <div className="min-h-0 flex-1 p-3">
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
        <p className="border-t border-[#2c1c19] px-3 py-1.5 text-center text-xs text-[#b8a39d]">
          Robot faces {direction} · {fog ? "solid dirt hides everything unexplored" : "dug-out (dark) dirt marks explored cells"}
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "error" }) {
  const color = tone === "error" ? "text-[#c84848]" : tone === "ok" ? "text-[#2f8f5b]" : "";
  return (
    <div className="min-w-0 rounded-lg border border-[#dfe4ec] bg-white px-3 py-1.5">
      <div className="text-xs text-[#65738a]">{label}</div>
      <div className={`truncate font-mono text-sm font-semibold ${color}`} title={value}>{value}</div>
    </div>
  );
}
