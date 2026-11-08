// A bánya fényei. A robot pixeles lámpafénye (components/scene/pixel-light.tsx, ugyanaz, mint a kezdőlapon és a
// bejelentkezésnél) követi a robotot, mintha zseblámpát tartana maga előtt. Fölötte (világosító keveréssel) az
// aranyrögök sima izzása és a lebegő por. A sötétség sosem teljes, így a felfedezett és
// a felfedezetlen mezők a fénykörön kívül is elkülönülnek.

import type { CSSProperties } from "react";
import type { Motion } from "@/components/robot-motion";
import PixelLight from "@/components/scene/pixel-light";
import { cellAt, DIRECTIONS, type GameMap } from "@/lib/robot-map";
import { cellOffset, slideTransition } from "./robot";

type Props = { map: GameMap; robot: GameMap["robot"]; cell: number; motion: Motion | null };

export function LightLayer({ map, robot, cell, motion }: Props) {
  // A fény képe kétszer akkora, mint a térkép, és a közepe a robot mezője: bárhol áll, a térképet mindig lefedi.
  // Csak irányváltáskor rajzolódik újra; a robottal együtt csúszik (ugyanazokkal a lépcsőkkel).
  const cols = 2 * map.cols + 1;
  const rows = 2 * map.rows + 1;
  const { dx, dy } = DIRECTIONS[robot.dir];
  const style: CSSProperties = {
    width: cols * cell,
    height: rows * cell,
    transform: cellOffset(robot.x - map.cols, robot.y - map.rows, cell),
    ...slideTransition(motion),
  };

  return (
    <div aria-hidden className="map-light">
      <PixelLight
        cols={cols}
        rows={rows}
        source={{ x: map.cols + 0.5, y: map.rows + 0.5, facing: Math.atan2(dy, dx) }}
        className="map-darkness"
        style={style}
      />
    </div>
  );
}

export function GlowLayer({ map, cell, glowing }: { map: GameMap; cell: number; glowing: boolean[] }) {
  return (
    <div aria-hidden className="map-glow">
      {glowing.map((glows, index) => glows && <GoldGlow key={index} {...cellAt(map, index)} cell={cell} />)}
      {DUST.map((mote, index) => (
        <i
          key={index}
          className="map-dust"
          style={{
            left: `${mote.left}%`,
            top: `${mote.top}%`,
            animationDuration: `${mote.seconds}s`,
            animationDelay: `${-mote.phase * mote.seconds}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Izzás egy aranyrög körül: kétszer akkora, állandó, sima fényfolt. */
function GoldGlow({ x, y, cell }: { x: number; y: number; cell: number }) {
  return (
    <span
      className="map-gold-glow"
      style={{
        width: cell * 2,
        height: cell * 2,
        transform: `translate(${(x - 0.5) * cell}px, ${(y - 0.5) * cell}px)`,
      }}
    />
  );
}

/** Porszemek: kezdőhely a térkép %-ában, egy kör ideje és a kezdőfázis (0–1), hogy ne egyszerre induljanak. */
const DUST = [
  { left: 8, top: 82, seconds: 9, phase: 0.1 },
  { left: 21, top: 40, seconds: 12, phase: 0.6 },
  { left: 33, top: 70, seconds: 10, phase: 0.35 },
  { left: 47, top: 22, seconds: 13, phase: 0.8 },
  { left: 58, top: 90, seconds: 11, phase: 0.5 },
  { left: 66, top: 55, seconds: 9.5, phase: 0.2 },
  { left: 78, top: 30, seconds: 12.5, phase: 0.95 },
  { left: 89, top: 75, seconds: 10.5, phase: 0.45 },
  { left: 14, top: 12, seconds: 14, phase: 0.7 },
  { left: 94, top: 8, seconds: 11.5, phase: 0.25 },
] as const;
