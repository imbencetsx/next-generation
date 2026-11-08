"use client";

// A szimulátor térképe pixel art színpadként (public/sprites). Felül és bal oldalt számozott bányagerenda
// (oszlopok, sorok), a rácson a mezők, fölöttük a robot fejlámpájának fénye, az arany izzása, a lebegő por,
// a robot és a lépésekhez tartozó látványelemek. A felolvasó a role="img" címkéjét kapja; a díszítés rejtett.
//
// Rétegek (app/globals.css, „pixel art térkép”): mezők → sötétség a fénykúppal → izzás és por → robot → effektek.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Motion } from "@/components/robot-motion";
import { TILE } from "@/components/sprites";
import { cellAt, type GameMap } from "@/lib/robot-map";
import { MapEffects } from "./effects";
import { GlowLayer, LightLayer } from "./lighting";
import { Robot } from "./robot";
import { Ruler } from "./ruler";
import { MapTile } from "./tile";

type Props = {
  map: GameMap;
  robot: GameMap["robot"];
  explored: boolean[];
  gold: boolean[];
  fog: boolean;
  /** A legutóbbi lépés mozgása; null esetén a robot ugrik, és minden mező azonnal frissül. */
  motion: Motion | null;
  /** Nem fut program (a futás előtt és a végén): teljes fény, minden mező jól látszik. Futás közben csak a robot lámpája világít. */
  lit: boolean;
  label: string;
};

/** A vonalzók vastagsága mezőben: fél mező, így a 16 px-es gerenda pixelei akkorák, mint a 32-es mezőké. */
const RULER_SHARE = 0.5;

export default function PixelMap({ map, robot, explored, gold, fog, motion, lit, label }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const size = useElementSize(frame);
  const { cell, ruler } = layout(size, map);
  // Mezőindex → hány ms múlva ér oda a robot a mostani mozgásban.
  const revealAt = new Map(motion?.reveals.map((reveal) => [reveal.index, reveal.at]));
  // Ködben csak a már látott arany izzik; az épp most felfedezett a robot érkezésekor bukkan elő.
  const glowing = gold.map((hasGold, index) => hasGold && (!fog || (explored[index] && !revealAt.has(index))));

  const stage = {
    "--cell": `${cell}px`,
    "--ruler": `${ruler}px`,
    "gridTemplateColumns": `${ruler}px ${map.cols * cell}px`,
    "gridTemplateRows": `${ruler}px ${map.rows * cell}px`,
  } as CSSProperties;

  return (
    <div ref={frame} className="flex h-full w-full items-center justify-center">
      <div className="map-stage grid shrink-0" style={stage}>
        <span aria-hidden className="pixel-sprite map-ruler-corner" />
        <Ruler axis="columns" count={map.cols} active={robot.x} />
        <Ruler axis="rows" count={map.rows} active={robot.y} />
        <div
          role="img"
          aria-label={label}
          className="pixel-map relative grid"
          data-lit={lit || undefined}
          // Falba ütközéskor megremeg; a két azonos animáció váltogatása újraindítja minden ütközésnél.
          data-shake={motion?.bump ? motion.id % 2 : undefined}
          style={{ gridTemplateColumns: `repeat(${map.cols}, ${cell}px)` }}
        >
          {map.walls.map((wall, index) => (
            <MapTile
              key={index}
              {...cellAt(map, index)}
              wall={wall}
              explored={explored[index]}
              gold={gold[index]}
              fog={fog}
              revealAt={revealAt.get(index)}
              motionId={motion?.id}
            />
          ))}
          <LightLayer map={map} robot={robot} cell={cell} motion={motion} />
          <GlowLayer map={map} cell={cell} glowing={glowing} />
          <Robot robot={robot} cell={cell} motion={motion} />
          {motion?.effects && <MapEffects key={motion.id} map={map} robot={robot} motion={motion} />}
        </div>
      </div>
    </div>
  );
}

type Size = { width: number; height: number; dpr: number };

/** Az elem aktuális mérete és az eszköz pixelaránya; átméretezéskor frissül. */
function useElementSize(element: React.RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0, dpr: 1 });
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height, dpr: window.devicePixelRatio || 1 }),
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [element]);
  return size;
}

/** Egész eszközpixelre kerekítés lefelé (legalább egy pixel), hogy ne legyen elmosódott varrat. */
const toDevicePixels = (value: number, dpr: number) => Math.max(1, Math.floor(value * dpr)) / dpr;

/**
 * A mező és a vonalzó mérete CSS-pixelben. A térkép a vonalzókkal együtt kitölti a rendelkezésre álló helyet,
 * amennyire az arány engedi, és sosem lóg ki a keretből. (A 32-es sprite-ok emiatt nem mindig egész szorzóval
 * nagyítódnak; a pixelated megjelenítés élesen tartja őket.)
 */
function layout(size: Size, map: GameMap) {
  const fit =
    size.width && size.height
      ? Math.min(size.width / (map.cols + RULER_SHARE), size.height / (map.rows + RULER_SHARE))
      : TILE;
  const cell = toDevicePixels(fit, size.dpr);
  return { cell, ruler: toDevicePixels(cell * RULER_SHARE, size.dpr) };
}
