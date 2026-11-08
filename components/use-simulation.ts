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
  { id: "turbo", delay: 1 },
] as const;
export type SpeedId = (typeof SPEEDS)[number]["id"];

/** A „megosztott” térkép neve, ha a link (?map=) név nélkül hozta (pl. a dokumentációból). */
const SHARED_MAP_NAME = "Shared map";

export type SimulationOptions = {
  /** A dokumentációból, a kezdőlapról vagy a térképszerkesztőből érkező térkép (?map=), ha van. */
  mapText?: string | null;
  /** A térkép neve (?mapName=), ha van. */
  mapName?: string | null;
  /** Ha a térkép közzétett térkép (?mapId=), az azonosítója: ekkor a befejezett futások eredménye rögzül. */
  mapId?: string | null;
  /** Minden végigért futás után hívódik (program vége, futásidejű hiba vagy sorkorlát): a futtatott program és
   * a közzétett térkép azonosítója (vagy null). A Visszaállítással leállított futás nem ér véget. */
  onRunEnd?: (run: { code: string; mapId: string | null }) => void;
};

/** Ha ezzel a lépéssel ért véget a futás, jelezzük. Egy futás csak egyszer ér véget, utána a gép nem lép. */
function reportIfEnded(
  snapshot: Snapshot,
  onRunEnd: SimulationOptions["onRunEnd"],
  run: { code: string; mapId: string | null },
) {
  if (snapshot.status !== "running") onRunEnd?.(run);
}

function initialMap({ mapText = null, mapName = null, mapId = null }: SimulationOptions) {
  // Beépített pálya linkből (kezdőlap, beépített pályák oldala): a választóban is az legyen kiválasztva.
  const presetIndex = mapId === null ? MAP_PRESETS.findIndex((preset) => preset.text === mapText) : -1;
  if (presetIndex >= 0) {
    const { name } = MAP_PRESETS[presetIndex];
    return { map: presetMap(presetIndex), name, publishedId: null, presetName: name, defaultMapName: false };
  }
  if (mapText !== null) {
    const result = parseMap(mapText);
    if (result.ok) {
      return {
        map: result.map,
        name: mapName?.trim() || SHARED_MAP_NAME,
        publishedId: mapId,
        presetName: null,
        defaultMapName: !mapName?.trim(),
      };
    }
  }
  return {
    map: presetMap(0),
    name: MAP_PRESETS[0].name,
    publishedId: null,
    presetName: MAP_PRESETS[0].name,
    defaultMapName: false,
  };
}

/** @param code A szerkesztőben lévő program; minden új futás ebből indul. */
export function useSimulation(code: string, options: SimulationOptions = {}) {
  const machine = useRef<Machine | null>(null);
  // A futás indításakor rögzített program: a futás végén ezt adjuk át, akkor is, ha közben átírták.
  const runCode = useRef("");
  // A visszahívást minden rendernél frissítjük, de a gép lépései (időzítő, gomb) mindig a legfrissebbet hívják.
  const onRunEnd = useRef(options.onRunEnd);
  const [initial] = useState(() => initialMap(options));
  const [map, setMap] = useState(initial.map);
  const [mapName, setMapName] = useState(initial.name);
  const [defaultMapName, setDefaultMapName] = useState(initial.defaultMapName);
  const [presetName, setPresetName] = useState<string | null>(initial.presetName);
  /** A közzétett térkép azonosítója, amíg az van betöltve; más térkép választásakor null. */
  const [publishedMapId, setPublishedMapId] = useState(initial.publishedId);
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

  useEffect(() => {
    onRunEnd.current = options.onRunEnd;
  }, [options.onRunEnd]);

  // Lejátszás: időzítve lépteti a gépet, amíg fut.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (!machine.current) return;
      const next = advance(machine.current, ++motionId.current, map.cols, delay);
      setMotion(next.motion);
      setSnapshot(next.snapshot);
      if (next.snapshot.status !== "running") setPlaying(false);
      reportIfEnded(next.snapshot, onRunEnd.current, { code: runCode.current, mapId: publishedMapId });
    }, delay);
    return () => clearInterval(timer);
  }, [playing, delay, map.cols, publishedMapId]);

  /** A futó gép (szünet után ezt folytatjuk), vagy egy új gép a jelenlegi programmal és térképpel. */
  function ensureMachine(): Machine | null {
    if (machine.current?.status === "running") return machine.current;

    const parsed = parseProgram(code);
    if (!parsed.ok) {
      setBlockedBy(parsed.issues.length);
      return null;
    }

    setBlockedBy(null);
    runCode.current = code;
    machine.current = new Machine(parsed.program, map);
    setSnapshot(machine.current.snapshot());
    setMotion(null);
    // Az üres program lépés nélkül, azonnal véget ér; ez is befejezett futás.
    if (machine.current.status !== "running") onRunEnd.current?.({ code, mapId: publishedMapId });
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
    reportIfEnded(next.snapshot, onRunEnd.current, { code: runCode.current, mapId: publishedMapId });
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
    setPresetName(name);
    setDefaultMapName(false);
    setPublishedMapId(null);
    setMapError(null);
  }

  async function importMap(file: File | undefined) {
    if (!file) return;

    // Hibás import esetén a jelenlegi térkép és futás maradjon meg.
    const result = parseMap(await file.text());
    if (!result.ok) {
      setMapError(result.error);
      return;
    }

    reset();
    setMap(result.map);
    setMapName(file.name);
    setPresetName(null);
    setDefaultMapName(false);
    setPublishedMapId(null);
    setMapError(null);
  }

  return {
    map,
    mapName,
    presetName,
    defaultMapName,
    publishedMapId,
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
