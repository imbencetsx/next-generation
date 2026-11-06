"use client";

// A robot aktuális állapota, a térkép és a futás vezérlői.

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowUp, BrickWall, Gem, Pause, Play, RotateCcw, SkipForward, Upload } from "lucide-react";
import { SPEEDS, type Simulation } from "@/components/use-simulation";
import { MAP_PRESETS, DIRECTIONS } from "@/lib/robot-map";

const ROTATION = [0, -90, 180, 90]; // észak, nyugat, dél, kelet

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
  const consoleEnd = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    consoleEnd.current?.scrollIntoView({ block: "nearest" });
  }, [snapshot.output.length]);

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-lg border border-[#dfe4ec] bg-white p-3" aria-label="Playback controls">
        <div className="flex flex-wrap items-center gap-2">
          {simulation.playing ? (
            <button className="btn" onClick={simulation.pause}><Pause size={16} aria-hidden /> Pause</button>
          ) : (
            <button className="btn btn-primary" onClick={runProgram}>
              <Play size={16} aria-hidden /> {runLabel}
            </button>
          )}
          <button className="btn" onClick={stepProgram} disabled={simulation.playing}><SkipForward size={16} aria-hidden /> Step</button>
          <button className="btn" onClick={simulation.reset} disabled={!simulation.started}><RotateCcw size={16} aria-hidden /> Reset</button>
          <label className="ml-auto flex items-center gap-2 text-xs text-[#65738a]">
            Speed
            <select className="btn" value={simulation.speed} onChange={(event) => simulation.setSpeed(Number(event.target.value))}>
              {SPEEDS.map((speed, index) => <option key={speed.label} value={index}>{speed.label}</option>)}
            </select>
          </label>
        </div>
        {simulation.notice && <p role="alert" className="mt-2 text-sm text-[#c84848]">{simulation.notice}</p>}
      </section>

      <section className="grid grid-cols-3 gap-2" aria-label="Run statistics">
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

      <section className="rounded-lg border border-[#dfe4ec] bg-white p-3" aria-label="Map">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold">Map <span className="font-normal text-[#65738a]">· {simulation.mapName}</span></h2>
          <label className="sr-only" htmlFor="map-select">Choose map</label>
          <select
            id="map-select" className="btn" value="" disabled={simulation.locked}
            onChange={(event) => simulation.selectMap(event.target.value)}
          >
            <option value="" disabled>Load map…</option>
            {MAP_PRESETS.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
          </select>
          <button className="btn" disabled={simulation.locked} onClick={() => fileInput.current?.click()}>
            <Upload size={16} aria-hidden /> Import
          </button>
          <input
            ref={fileInput} type="file" accept=".txt,.map,text/plain" hidden
            onChange={importMap}
          />
          <button className="btn" aria-pressed={fog} onClick={() => setFog((value) => !value)}>Fog</button>
        </div>
        {simulation.mapError && <p role="alert" className="mb-2 text-sm text-[#c84848]">{simulation.mapError}</p>}

        <div
          role="img"
          aria-label={`Map with ${map.rows} rows and ${map.cols} columns. Robot at row ${snapshot.robot.y + 1}, column ${snapshot.robot.x + 1}, facing ${direction}.`}
          className="mx-auto grid gap-px overflow-hidden rounded-md border border-[#cfd6e2] bg-[#cfd6e2]"
          style={{ gridTemplateColumns: `repeat(${map.cols}, minmax(0, 1fr))`, maxWidth: map.cols * 52 }}
        >
          {map.walls.map((wall, index) => {
            const x = index % map.cols;
            const y = Math.floor(index / map.cols);
            const explored = snapshot.explored[index];
            const hidden = fog && !explored;
            const hasRobot = snapshot.robot.x === x && snapshot.robot.y === y;
            const hasGold = snapshot.gold[index];
            return (
              <div
                key={index} aria-hidden
                className={`relative flex aspect-square items-center justify-center ${
                  hidden ? "cell-fog" : wall ? "bg-[#5b6678] text-[#d8deea]" : explored ? "bg-white" : "bg-[#eef1f6]"
                } ${!explored && !hidden ? "opacity-70" : ""}`}
              >
                {!hidden && wall && <BrickWall className="h-3/5 w-3/5" />}
                {!hidden && hasGold && <Gem className={`h-3/5 w-3/5 text-[#d99a1d] ${hasRobot ? "absolute right-0.5 top-0.5 !h-2/5 !w-2/5" : ""}`} />}
                {hasRobot && (
                  <span className="flex h-4/5 w-4/5 items-center justify-center rounded bg-[#4666ce] text-white">
                    <ArrowUp
                      className="h-3/4 w-3/4 transition-transform motion-reduce:transition-none"
                      style={{ transform: `rotate(${ROTATION[snapshot.robot.dir]}deg)` }}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-xs text-[#65738a]">
          Robot faces {direction} · lighter cells are explored{fog ? " · fog hides the rest" : ""}
        </p>
      </section>

      <section className="rounded-lg border border-[#dfe4ec] bg-white p-3" aria-labelledby="console-title">
        <h2 id="console-title" className="mb-2 text-sm font-semibold">Console</h2>
        <div role="log" aria-live="polite" className="h-28 overflow-auto rounded bg-[#1f2937] p-2 font-mono text-xs text-slate-100">
          {snapshot.output.length === 0 && <span className="text-slate-400">print output appears here</span>}
          {snapshot.output.map((line, index) => <div key={index}><span className="text-slate-500">&gt; </span>{line}</div>)}
          <div ref={consoleEnd} />
        </div>
        <h3 className="mb-1 mt-3 text-xs font-semibold text-[#65738a]">Variables</h3>
        {snapshot.variables.length === 0 ? (
          <p className="text-xs text-[#65738a]">None yet.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
            {snapshot.variables.map(([name, value]) => (
              <div key={name} className="contents"><dt className="text-[#247d88]">{name}</dt><dd>{String(value)}</dd></div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "error" }) {
  const color = tone === "error" ? "text-[#c84848]" : tone === "ok" ? "text-[#2f8f5b]" : "";
  return (
    <div className="rounded-lg border border-[#dfe4ec] bg-white px-3 py-2">
      <div className="text-xs text-[#65738a]">{label}</div>
      <div className={`font-mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
