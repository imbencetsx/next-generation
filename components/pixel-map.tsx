"use client";

// A térkép pixel art megjelenítése a public/sprites alatti 32×32-es képekből.
// A képek cserélhetők: azonos néven felülírva a térkép azonnal az új rajzot használja.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Motion } from "@/components/use-simulation";
import type { GameMap } from "@/lib/robot-map";

const TILE = 32;
const MAX_SCALE = 8;
// robot_sheet.png: 4×4 képkocka (32×32). Oszlopok: áll, lépés 1–3. Sorok a képen: le, balra, jobbra, fel.
// Irány → sor (észak, nyugat, dél, kelet).
const ROBOT_ROW = [3, 1, 0, 2];
// A talp alatti üres hely képkockánként eltér; ezt eltoljuk, hogy a robot a mező alján álljon.
// Irányonként: álló kép, majd a három járásképkocka, az eredeti sprite pixelméretében.
const ROBOT_FOOT_PADDING = [
  [7, 7, 7, 7],
  [4, 3, 4, 3],
  [3, 2, 3, 2],
  [5, 4, 4, 4],
];
const WALK_FRAMES = 3;
const SHINE_FRAMES = ["down-half", "down", "up-half", "up"] as const;
// Mezőnként ennyi ugrással lép a robot (32 px-es sprite-nál 8 pixelenként), hogy ne simán csússzon.
const FRAMES_PER_CELL = 4;

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

const sprite = (name: string): CSSProperties => ({ backgroundImage: `url(/sprites/${name}.png)` });

export default function PixelMap({ map, robot, explored, gold, fog, motion, label }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Egész számú nagyítás, hogy minden pixel egyforma és éles maradjon; ha a 32 px sem fér el, kicsinyítünk.
  const fit = size.width && size.height ? Math.min(size.width / map.cols, size.height / map.rows) : TILE;
  const cell = fit >= TILE ? Math.min(MAX_SCALE, Math.floor(fit / TILE)) * TILE : Math.max(8, Math.floor(fit));

  const revealAt = new Map(motion?.reveals.map((reveal) => [reveal.index, reveal.at]));
  const footPadding = ROBOT_FOOT_PADDING[robot.dir];

  return (
    <div ref={frame} className="flex h-full w-full items-center justify-center">
      <div
        role="img"
        aria-label={label}
        className="pixel-map relative grid shrink-0"
        style={{ width: map.cols * cell, height: map.rows * cell, gridTemplateColumns: `repeat(${map.cols}, ${cell}px)` }}
      >
        {map.walls.map((wall, index) => {
          const x = index % map.cols;
          const y = Math.floor(index / map.cols);
          const hidden = fog && !explored[index];
          // A látott mező kiásott (sötét) föld, a többi tömör föld; az arany külön rétegként ül rajta.
          const tile = hidden ? "full_dirt" : wall ? "wall" : explored[index] ? "empty-dirt" : "full_dirt";
          const showGold = gold[index] && !hidden;
          const reveal = revealAt.get(index);
          return (
            <div key={index} aria-hidden className="pixel-sprite relative" style={sprite(tile)}>
              {reveal !== undefined && (
                // A tömör föld addig takarja a kiásott hátteret, amíg a robot oda nem ér.
                <span
                  key={`cover-${motion!.id}`}
                  className="pixel-sprite pixel-cover"
                  style={{ ...sprite("full_dirt"), animationDelay: `${reveal}ms` }}
                />
              )}
              {showGold && (
                // A rögök a takarás fölött vannak, így ásás közben sem tűnnek el; ködben csak a robot érkezésekor bukkannak elő.
                <span
                  key={fog && reveal !== undefined ? `gold-${motion!.id}` : "gold"}
                  className={`gold-shine${fog && reveal !== undefined ? " pixel-appear" : ""}`}
                  style={{
                    "--shine-delay": `${-((x * 7 + y * 13) % 10) * 0.32}s`,
                    ...(fog && reveal !== undefined ? { animationDelay: `${reveal}ms` } : {}),
                  } as CSSProperties}
                >
                  <i className="chips" />
                  {SHINE_FRAMES.map((name) => <i key={name} className={`shine-${name}`} />)}
                </span>
              )}
            </div>
          );
        })}
        <div
          aria-hidden
          className="pixel-robot"
          style={{ width: cell, height: cell, transform: `translate(${robot.x * cell}px, ${robot.y * cell}px)`, transitionDuration: `${motion?.duration ?? 0}ms`, transitionTimingFunction: `steps(${Math.max(1, (motion?.cells ?? 0) * FRAMES_PER_CELL)}, end)` }}
        >
          <div
            // Új mozgásnál újraindul a járás; megálláskor (az animáció végén) visszaáll az álló képkockára.
            key={motion?.id ?? "idle"}
            className="pixel-robot-sprite h-full w-full"
            style={{
              backgroundPosition: `0% ${(ROBOT_ROW[robot.dir] * 100) / 3}%`,
              "--robot-foot-idle": `${(footPadding[0] / TILE) * 100}%`,
              "--robot-foot-walk-1": `${(footPadding[1] / TILE) * 100}%`,
              "--robot-foot-walk-2": `${(footPadding[2] / TILE) * 100}%`,
              "--robot-foot-walk-3": `${(footPadding[3] / TILE) * 100}%`,
              ...(motion?.cells
                ? {
                    animationName: "robot-walk",
                    animationDuration: `${(motion.duration / (motion.cells * FRAMES_PER_CELL)) * WALK_FRAMES}ms`,
                    animationIterationCount: (motion.cells * FRAMES_PER_CELL) / WALK_FRAMES,
                  }
                : {}),
            } as CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}
