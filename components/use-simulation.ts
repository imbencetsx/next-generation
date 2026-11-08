"use client";

// A futás állapota a felületen: a térkép, a gép (Machine), a lejátszás időzítője és a legutóbbi mozgás.
// A játékszabályok a motorban (lib/interpreter.ts) vannak; ez a hook csak lépteti a gépet és tárolja a
// pillanatképet. Az animáció időzítése a robot-motion.ts-ben van.
//
// Időutazás: a futás minden feldolgozott sor utáni pillanatképét megőrizzük (history), így az idővonalon vissza
// lehet nézni bármelyik korábbi állapotot (térkép, aktuális sor, konzol, változók). Visszanézés közben a gép nem
// változik; a rögzített eredmény és a lépésszám mindig a valódi futásé.

import { useEffect, useRef, useState } from "react";
import { advance, type Motion } from "@/components/robot-motion";
import { Machine, idleSnapshot, parseProgram, type Snapshot } from "@/lib/interpreter";
import { createMap } from "@/lib/map-editor";
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
  // Beépített pálya linkből: a nevét lefordíthatjuk, de a munkafelületen nincs pályaválasztó.
  const presetIndex = mapId === null ? MAP_PRESETS.findIndex((preset) => preset.text === mapText) : -1;
  if (presetIndex >= 0) {
    const { name } = MAP_PRESETS[presetIndex];
    return {
      map: presetMap(presetIndex),
      name,
      publishedId: null,
      presetName: name,
      defaultMapName: false,
      hasMap: true,
    };
  }
  if (mapText !== null) {
    const result = parseMap(mapText);
    if (result.ok) {
      return {
        hasMap: true,
        map: result.map,
        name: mapName?.trim() || SHARED_MAP_NAME,
        publishedId: mapId,
        presetName: null,
        defaultMapName: !mapName?.trim(),
      };
    }
  }
  return {
    // Belső üres alapállapot; import vagy pályalink nélkül nem jelenítjük meg és nem futtatjuk.
    hasMap: false,
    map: createMap(1, 1),
    name: "",
    publishedId: null,
    presetName: null,
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
  const [hasMap, setHasMap] = useState(initial.hasMap);
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
  // A futás pillanatképei: [0] az indulás, [n] az n-edik lépés után. null nézet: az élő (legutolsó) állapot.
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);

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
      setHistory((previous) => [...previous, next.snapshot]);
      if (next.snapshot.status !== "running") setPlaying(false);
      reportIfEnded(next.snapshot, onRunEnd.current, { code: runCode.current, mapId: publishedMapId });
    }, delay);
    return () => clearInterval(timer);
  }, [playing, delay, map.cols, publishedMapId]);

  /** A futó gép (szünet után ezt folytatjuk), vagy egy új gép a jelenlegi programmal és térképpel. */
  function ensureMachine(): Machine | null {
    if (!hasMap) return null;
    if (machine.current?.status === "running") return machine.current;

    const parsed = parseProgram(code);
    if (!parsed.ok) {
      setBlockedBy(parsed.issues.length);
      return null;
    }

    setBlockedBy(null);
    runCode.current = code;
    machine.current = new Machine(parsed.program, map);
    const start = machine.current.snapshot();
    setSnapshot(start);
    setHistory([start]);
    setViewIndex(null);
    setMotion(null);
    // Az üres program lépés nélkül, azonnal véget ér; ez is befejezett futás.
    if (machine.current.status !== "running") onRunEnd.current?.({ code, mapId: publishedMapId });
    return machine.current;
  }

  function run() {
    // Visszanézés közben a futtatás az élő állapottól folytatódik.
    setViewIndex(null);
    const current = ensureMachine();
    if (current?.status === "running") setPlaying(true);
  }

  function pause() {
    setPlaying(false);
  }

  function step() {
    // Visszanézés közben a lépés csak az idővonalon halad előre, a gépet nem lépteti.
    if (viewIndex !== null) return seek(viewIndex + 1);
    const current = ensureMachine();
    if (!current) return;
    const next = advance(current, ++motionId.current, map.cols, delay);
    setMotion(next.motion);
    setSnapshot(next.snapshot);
    setHistory((previous) => [...previous, next.snapshot]);
    setPlaying(false);
    reportIfEnded(next.snapshot, onRunEnd.current, { code: runCode.current, mapId: publishedMapId });
  }

  /** Az idővonal egy pontjára ugrik (0 = indulás); az utolsó pont az élő állapot. A lejátszás megáll. */
  function seek(index: number) {
    setPlaying(false);
    const last = history.length - 1;
    const target = Math.max(0, Math.min(index, last));
    setViewIndex(target >= last ? null : target);
  }

  function stepBack() {
    seek((viewIndex ?? history.length - 1) - 1);
  }

  function reset() {
    machine.current = null;
    setHistory([]);
    setViewIndex(null);
    setSnapshot(null);
    setPlaying(false);
    setBlockedBy(null);
    setMotion(null);
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
    setHasMap(true);
    setMapName(file.name);
    setPresetName(null);
    setDefaultMapName(false);
    setPublishedMapId(null);
    setMapError(null);
  }

  return {
    map,
    hasMap,
    mapName,
    presetName,
    defaultMapName,
    publishedMapId,
    mapError,
    blockedBy,
    playing,
    speed,
    setSpeed,
    // Visszanézéskor a megjelenített állapot a kiválasztott korábbi pillanatkép, mozgásanimáció nélkül.
    motion: viewIndex === null ? motion : null,
    snapshot: (viewIndex !== null ? history[viewIndex] : snapshot) ?? idleSnapshot(map),
    timeline: {
      /** A futás pillanatképei (üres, ha még nem indult futás). */
      history,
      /** A megjelenített pillanatkép indexe a history-ban. */
      index: viewIndex ?? Math.max(0, history.length - 1),
      /** Korábbi állapotot nézünk (nem az élőt). */
      reviewing: viewIndex !== null,
      seek,
      stepBack,
      /** Vissza az élő állapothoz. */
      live: () => setViewIndex(null),
    },
    /** A valódi (élő) futás állapota, visszanézés közben is; a futtatás gombja ehhez igazodik. */
    liveStatus: snapshot?.status ?? "idle",
    /** Volt-e már futás a legutóbbi visszaállítás óta. */
    started: snapshot !== null,
    /** Futás közben a program és a térkép nem módosítható. */
    locked: snapshot?.status === "running",
    run,
    pause,
    step,
    reset,
    importMap,
  };
}

export type { Motion } from "@/components/robot-motion";
export type Simulation = ReturnType<typeof useSimulation>;
