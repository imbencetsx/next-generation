// Kis, statikus térkép a dokumentációhoz, a játék saját sprite-jaival (animáció nélkül).
// Ugyanaz a jelölés, mint a szimulátorban: tégla a fal, kiásott föld a felfedezett mező, tömör föld a többi.

import type { CSSProperties } from "react";
import { ROBOT_FOOT_PADDING, ROBOT_ROW, TILE } from "@/components/sprites";
import { DIRECTIONS, type GameMap } from "@/lib/robot-map";

const DIRECTION_HU: Record<string, string> = { north: "észak", west: "nyugat", south: "dél", east: "kelet" };

type Props = {
  map: GameMap;
  robot?: GameMap["robot"];
  gold?: boolean[];
  /** Futás utáni állapot; ha hiányzik, csak a robot kezdőmezője felfedezett. */
  explored?: boolean[];
  caption?: string;
  cell?: number;
};

const sprite = (name: string): CSSProperties => ({ backgroundImage: `url(/sprites/${name}.png)` });

export function MiniMap({ map, robot = map.robot, gold = map.gold, explored, caption, cell = 24 }: Props) {
  const robotIndex = robot.y * map.cols + robot.x;
  const label = `${map.rows}×${map.cols} térkép, a robot a ${robot.y + 1}. sor ${robot.x + 1}. oszlopában áll, ${DIRECTION_HU[DIRECTIONS[robot.dir].name]} felé néz.`;
  const foot = ROBOT_FOOT_PADDING[robot.dir][0];

  return (
    <figure className="m-0 flex shrink-0 flex-col items-center gap-1.5">
      <div
        role="img"
        aria-label={label}
        className="pixel-map grid border-2 border-border"
        style={{ gridTemplateColumns: `repeat(${map.cols}, ${cell}px)` }}
      >
        {map.walls.map((wall, index) => {
          const seen = explored ? explored[index] : index === robotIndex;
          const tile = wall ? "wall" : seen ? "empty-dirt" : "full_dirt";
          return (
            <div key={index} aria-hidden className="pixel-sprite relative" style={{ ...sprite(tile), width: cell, height: cell }}>
              {!wall && gold[index] && <span className="pixel-sprite absolute inset-0" style={sprite("gold_chips")} />}
              {index === robotIndex && (
                <span
                  className="pixel-robot-sprite absolute inset-0"
                  style={{ backgroundPosition: `0% ${(ROBOT_ROW[robot.dir] * 100) / 3}%`, "--robot-foot-idle": `${(foot / TILE) * 100}%` } as CSSProperties}
                />
              )}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="font-read text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
