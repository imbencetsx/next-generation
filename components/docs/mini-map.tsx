// Kis, statikus térkép a dokumentációhoz, a játék saját sprite-jaival (animáció nélkül).
// Ugyanaz a jelölés, mint a szimulátorban: tégla a fal, kiásott föld a felfedezett mező, tömör föld a többi.

import { robotSpriteStyle, tileBackground, TILES } from "@/components/sprites";
import { cellIndex, DIRECTIONS, type GameMap } from "@/lib/robot-map";

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

export function MiniMap({ map, robot = map.robot, gold = map.gold, explored, caption, cell = 24 }: Props) {
  const robotIndex = cellIndex(map, robot.x, robot.y);
  const facing = DIRECTION_HU[DIRECTIONS[robot.dir].name];
  const label = `${map.rows}×${map.cols} térkép, a robot a ${robot.y + 1}. sor ${robot.x + 1}. oszlopában áll, ${facing} felé néz.`;

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
          const tile = wall ? TILES.wall : seen ? TILES.dug : TILES.solid;
          return (
            <div
              key={index}
              aria-hidden
              className="pixel-sprite relative"
              style={{ ...tileBackground(tile), width: cell, height: cell }}
            >
              {!wall && gold[index] && <span className="gold-sprite absolute inset-0" />}
              {index === robotIndex && (
                <span className="pixel-robot-sprite absolute inset-0" style={robotSpriteStyle(robot.dir)} />
              )}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="font-read text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
