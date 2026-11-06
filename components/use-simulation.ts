"use client";

// A futás indítása, léptetése és időzített lejátszása.

import { useEffect, useRef, useState } from "react";
import { Machine, idleSnapshot, parseProgram, type Snapshot, type StepEvent } from "@/lib/interpreter";
import { MAP_PRESETS, parseMap, presetMap } from "@/lib/robot-map";

// A sebességek nevei a szótárban vannak (sim.speeds, azonos sorrendben).
export const SPEEDS = [{ delay: 600 }, { delay: 250 }, { delay: 80 }, { delay: 10 }] as const;

/** A legutóbbi lépés mozgása: meddig csúszik a robot, és melyik mező mikor ásódik ki alatta. */
export type Motion = { id: number; duration: number; cells: number; reveals: { index: number; at: number }[] };

const CELL_MS = 200;

// A mező akkor ásódik ki, amikor a robot eleje beér (a mező felénél), nem a lépés indulásakor.
function motionFor(id: number, before: Snapshot, event: StepEvent | null, cols: number, delay: number): Motion {
  const path = event?.path ?? [];
  if (!path.length) return { id, duration: 0, cells: 0, reveals: [] };
  const duration = Math.min(path.length * CELL_MS, delay * 0.85);
  const reveals = path.flatMap((cell, k) => {
    const index = cell.y * cols + cell.x;
    return before.explored[index] ? [] : [{ index, at: (duration * (k + 0.5)) / path.length }];
  });
  return { id, duration, cells: path.length, reveals };
}

function initialMap(text: string | null) {
  if (text !== null) {
    const result = parseMap(text);
    if (result.ok) return { map: result.map, name: "Shared map" };
  }
  return { map: presetMap(0), name: MAP_PRESETS[0].name };
}

export function useSimulation(code: string, initialMapText: string | null = null) {
  const machine = useRef<Machine | null>(null);
  const [initial] = useState(() => initialMap(initialMapText));
  const [map, setMap] = useState(initial.map);
  const [mapName, setMapName] = useState(initial.name);
  const [mapError, setMapError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Ennyi szintaktikai hiba miatt nem indult el a futás (a szöveget a felület adja).
  const [blockedBy, setBlockedBy] = useState<number | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const motionId = useRef(0);

  const delay = SPEEDS[speed].delay;

  useEffect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      const current = machine.current;
      if (!current) return;

      const before = current.snapshot();
      const event = current.step();
      const next = current.snapshot();
      setMotion(motionFor(++motionId.current, before, event, map.cols, delay));
      setSnapshot(next);
      if (next.status !== "running") setPlaying(false);
    }, delay);

    return () => clearInterval(timer);
  }, [playing, delay, map.cols]);

  // Szünet után folytatunk; befejezés vagy visszaállítás után új futást indítunk.
  function ensureMachine(): Machine | null {
    if (machine.current?.status === "running") return machine.current;

    const parsed = parseProgram(code);
    if (!parsed.ok) {
      setBlockedBy(parsed.issues.length);
      return null;
    }

    setBlockedBy(null);
    machine.current = new Machine(parsed.program, map);
    setSnapshot(machine.current.snapshot());
    setMotion(null);
    return machine.current;
  }

  function run() {
    const current = ensureMachine();
    if (current?.status === "running") setPlaying(true);
  }

  function pause() {
    setPlaying(false);
  }

  function step() {
    const current = ensureMachine();
    if (!current) return;

    const before = current.snapshot();
    const event = current.step();
    setMotion(motionFor(++motionId.current, before, event, map.cols, delay));
    setSnapshot(current.snapshot());
    setPlaying(false);
  }

  function reset() {
    machine.current = null;
    setSnapshot(null);
    setPlaying(false);
    setBlockedBy(null);
    setMotion(null);
  }

  function selectMap(name: string) {
    const index = MAP_PRESETS.findIndex((preset) => preset.name === name);
    if (index < 0) return;

    reset();
    setMap(presetMap(index));
    setMapName(name);
    setMapError(null);
  }

  async function importMap(file: File | undefined) {
    if (!file) return;

    // Hibás import esetén a jelenlegi térkép és futás maradjon meg.
    const result = parseMap(await file.text());
    if (!result.ok) {
      setMapError(`${file.name}: ${result.error}`);
      return;
    }

    reset();
    setMap(result.map);
    setMapName(file.name);
    setMapError(null);
  }

  return {
    map,
    mapName,
    mapError,
    blockedBy,
    playing,
    speed,
    setSpeed,
    motion,
    snapshot: snapshot ?? idleSnapshot(map),
    started: snapshot !== null,
    locked: snapshot?.status === "running",
    run,
    pause,
    step,
    reset,
    selectMap,
    importMap,
  };
}

export type Simulation = ReturnType<typeof useSimulation>;
