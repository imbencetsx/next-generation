"use client";

// A futás állapota a felületen: a térkép, a gép (Machine), a lejátszás időzítője és a legutóbbi mozgás.
// A játékszabályok a motorban (lib/interpreter.ts) vannak; ez a hook csak lépteti a gépet és tárolja a
// pillanatképet. Az animáció időzítése a robot-motion.ts-ben van.

import { useEffect, useRef, useState } from "react";
import { advance, type Motion } from "@/components/robot-motion";
import { Machine, idleSnapshot, parseProgram, type Snapshot } from "@/lib/interpreter";
import { MAP_PRESETS, parseMap, presetMap } from "@/lib/robot-map";

/** Lejátszási sebességek: két feldolgozott sor között ennyi ms telik el. A feliratok: sim.speeds. */
export const SPEEDS = [
  { id: "slow", delay: 600 },
  { id: "normal", delay: 250 },
  { id: "fast", delay: 80 },
  { id: "turbo", delay: 10 },
] as const;
export type SpeedId = (typeof SPEEDS)[number]["id"];

/** A „megosztott” térkép neve, ha a dokumentáció linkje (?map=) hozta. */
const SHARED_MAP_NAME = "Shared map";

function initialMap(text: string | null) {
  if (text !== null) {
    const result = parseMap(text);
    if (result.ok) return { map: result.map, name: SHARED_MAP_NAME };
  }
  return { map: presetMap(0), name: MAP_PRESETS[0].name };
}

/**
 * @param code A szerkesztőben lévő program; minden új futás ebből indul.
 * @param initialMapText A dokumentációból érkező térkép (?map=), ha van.
 */
export function useSimulation(code: string, initialMapText: string | null = null) {
  const machine = useRef<Machine | null>(null);
  const [initial] = useState(() => initialMap(initialMapText));
  const [map, setMap] = useState(initial.map);
  const [mapName, setMapName] = useState(initial.name);
  const [mapError, setMapError] = useState<string | null>(null);
  // null: még nem indult futás (a felület ilyenkor a kezdőállapotot mutatja).
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedId>("normal");
  // Ennyi szintaktikai hiba miatt nem indult el a futás (a szöveget a felület adja).
  const [blockedBy, setBlockedBy] = useState<number | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const motionId = useRef(0);

  const delay = SPEEDS.find((option) => option.id === speed)!.delay;

  // Lejátszás: időzítve lépteti a gépet, amíg fut.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (!machine.current) return;
      const next = advance(machine.current, ++motionId.current, map.cols, delay);
      setMotion(next.motion);
      setSnapshot(next.snapshot);
      if (next.snapshot.status !== "running") setPlaying(false);
    }, delay);
    return () => clearInterval(timer);
  }, [playing, delay, map.cols]);

  /** A futó gép (szünet után ezt folytatjuk), vagy egy új gép a jelenlegi programmal és térképpel. */
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
    const next = advance(current, ++motionId.current, map.cols, delay);
    setMotion(next.motion);
    setSnapshot(next.snapshot);
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
    /** Volt-e már futás a legutóbbi visszaállítás óta. */
    started: snapshot !== null,
    /** Futás közben a program és a térkép nem módosítható. */
    locked: snapshot?.status === "running",
    run,
    pause,
    step,
    reset,
    selectMap,
    importMap,
  };
}

export type { Motion } from "@/components/robot-motion";
export type Simulation = ReturnType<typeof useSimulation>;
