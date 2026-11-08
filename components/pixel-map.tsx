"use client";

// A térkép pixel art megjelenítése a public/sprites alatti 32×32-es képekből.
// A képek cserélhetők: azonos néven felülírva a térkép azonnal az új rajzot használja.
//
// Rétegek mezőnként: alul a mező képe (fal / kiásott / tömör föld), fölötte mozgás közben egy takaró
// tömör föld, ami a robot érkezésekor tűnik el, legfelül az arany. A robot külön réteg a rács fölött.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { mapTile, robotSpriteStyle, shineDelay, TILE, tileBackground, TILES } from "@/components/sprites";
import type { Motion } from "@/components/robot-motion";
import { cellAt, type GameMap } from "@/lib/robot-map";

/** A járásanimáció képkockái a sprite-lapon (az álló kép nélkül). */
const WALK_FRAMES = 3;
/** Mezőnként ennyi ugrással lép a robot (32 px-es sprite-nál 8 pixelenként), hogy ne simán csússzon. */
const JUMPS_PER_CELL = 4;

type Props = {
  map: GameMap;
  robot: GameMap["robot"];
  explored: boolean[];
  gold: boolean[];
  fog: boolean;
  /** A legutóbbi lépés mozgása; null esetén a robot ugrik, és minden mező azonnal frissül. */
  motion: Motion | null;
  label: string;
};

export default function PixelMap({ map, robot, explored, gold, fog, motion, label }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const size = useElementSize(frame);
  const cell = cellSize(size, map);
  // Mezőindex → hány ms múlva ér oda a robot a mostani mozgásban.
  const revealAt = new Map(motion?.reveals.map((reveal) => [reveal.index, reveal.at]));

  return (
    <div ref={frame} className="flex h-full w-full items-center justify-center">
      <div
        role="img"
        aria-label={label}
        className="pixel-map relative grid shrink-0"
        style={{
          width: map.cols * cell,
          height: map.rows * cell,
          gridTemplateColumns: `repeat(${map.cols}, ${cell}px)`,
        }}
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
        <Robot robot={robot} cell={cell} motion={motion} />
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

/**
 * Egy mező mérete CSS-pixelben. A térkép mindig kitölti a rendelkezésre álló helyet, amennyire az arány
 * engedi. A cellaméretet egész eszközpixelre kerekítjük lefelé, így a mezők között nincs elmosódott varrat,
 * és sosem lóg ki a keretből. (A 32-es sprite-ok emiatt nem mindig egész szorzóval nagyítódnak; a pixelated
 * megjelenítés élesen tartja őket.)
 */
function cellSize(size: Size, map: GameMap): number {
  const fit = size.width && size.height ? Math.min(size.width / map.cols, size.height / map.rows) : TILE;
  return Math.max(1, Math.floor(fit * size.dpr)) / size.dpr;
}

type TileProps = {
  x: number;
  y: number;
  wall: boolean;
  explored: boolean;
  gold: boolean;
  fog: boolean;
  /** Ha a robot most halad át ezen a mezőn: hány ms múlva ér ide. */
  revealAt: number | undefined;
  motionId: number | undefined;
};

function MapTile({ x, y, wall, explored, gold, fog, revealAt, motionId }: TileProps) {
  const hidden = fog && !explored;
  // A mező képe a felfedezettségtől függ (mapTile); az arany külön rétegként ül rajta.
  const tile = mapTile(wall, explored, fog);
  const revealing = revealAt !== undefined;
  // Ködben az arany csak akkor bukkan elő, amikor a robot odaér.
  const goldAppears = fog && revealing;

  return (
    <div aria-hidden className="pixel-sprite relative" style={tileBackground(tile)}>
      {revealing && (
        // A tömör föld addig takarja a kiásott hátteret, amíg a robot oda nem ér.
        <span
          key={`cover-${motionId}`}
          className="pixel-sprite pixel-cover"
          style={{ ...tileBackground(TILES.solid), animationDelay: `${revealAt}ms` }}
        />
      )}
      {gold && !hidden && (
        // A rögök a takarás fölött vannak, így ásás közben sem tűnnek el.
        <span
          key={goldAppears ? `gold-${motionId}` : "gold"}
          className={`gold-shine${goldAppears ? " pixel-appear" : ""}`}
          style={
            {
              "--shine-delay": `${shineDelay(x, y)}s`,
              ...(goldAppears ? { animationDelay: `${revealAt}ms` } : {}),
            } as CSSProperties
          }
        >
          <i className="gold-sprite gold-sparkle absolute inset-0" />
        </span>
      )}
    </div>
  );
}

/** A robot: a pozíciója lépcsőzetes átmenettel csúszik, közben a járásanimáció fut. */
function Robot({ robot, cell, motion }: { robot: GameMap["robot"]; cell: number; motion: Motion | null }) {
  const jumps = (motion?.cells ?? 0) * JUMPS_PER_CELL;
  const walking: CSSProperties = motion?.cells
    ? {
        animationName: "robot-walk",
        // Egy teljes járásciklus WALK_FRAMES ugrásig tart; a ciklus annyiszor fut, ahány ugrás van.
        animationDuration: `${(motion.duration / jumps) * WALK_FRAMES}ms`,
        animationIterationCount: jumps / WALK_FRAMES,
      }
    : {};

  return (
    <div
      aria-hidden
      className="pixel-robot"
      style={{
        width: cell,
        height: cell,
        transform: `translate(${robot.x * cell}px, ${robot.y * cell}px)`,
        transitionDuration: `${motion?.duration ?? 0}ms`,
        transitionTimingFunction: `steps(${Math.max(1, jumps)}, end)`,
      }}
    >
      <div
        // Új mozgásnál újraindul a járás; megálláskor (az animáció végén) visszaáll az álló képkockára.
        key={motion?.id ?? "idle"}
        className="pixel-robot-sprite h-full w-full"
        style={{ ...robotSpriteStyle(robot.dir), ...walking }}
      />
    </div>
  );
}
