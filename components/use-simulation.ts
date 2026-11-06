"use client";

// A futás indítása, léptetése és időzített lejátszása.

import { useEffect, useRef, useState } from "react";
import { Machine, idleSnapshot, parseProgram, type Snapshot } from "@/lib/interpreter";
import { MAP_PRESETS, parseMap, presetMap } from "@/lib/robot-map";

export const SPEEDS = [
  { label: "Slow", delay: 600 },
  { label: "Normal", delay: 250 },
  { label: "Fast", delay: 80 },
  { label: "Turbo", delay: 10 },
] as const;

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
  const [notice, setNotice] = useState<string | null>(null);

  const delay = SPEEDS[speed].delay;

  useEffect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      const current = machine.current;
      if (!current) return;

      current.step();
      const next = current.snapshot();
      setSnapshot(next);
      if (next.status !== "running") setPlaying(false);
    }, delay);

    return () => clearInterval(timer);
  }, [playing, delay]);

  // Szünet után folytatunk; befejezés vagy visszaállítás után új futást indítunk.
  function ensureMachine(): Machine | null {
    if (machine.current?.status === "running") return machine.current;

    const parsed = parseProgram(code);
    if (!parsed.ok) {
      const count = parsed.issues.length;
      setNotice(`Fix ${count} syntax error${count > 1 ? "s" : ""} before running.`);
      return null;
    }

    setNotice(null);
    machine.current = new Machine(parsed.program, map);
    setSnapshot(machine.current.snapshot());
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

    current.step();
    setSnapshot(current.snapshot());
    setPlaying(false);
  }

  function reset() {
    machine.current = null;
    setSnapshot(null);
    setPlaying(false);
    setNotice(null);
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
    notice,
    playing,
    speed,
    setSpeed,
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
