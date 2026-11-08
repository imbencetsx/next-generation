// Kis, statikus térkép a játék saját sprite-jaival (animáció nélkül): a dokumentáció példáihoz és a kezdőlap
// térképkártyáihoz.
// Ugyanaz a jelölés, mint a szimulátorban (mapTile): a felfedezett mező kiásott föld vagy világos tégla,
// a felfedezetlen tömör föld vagy sötét tégla.

import RobotSprite from "@/components/robot-sprite";
import { mapTile, robotSpriteStyle, tileBackground } from "@/components/sprites";
import GoldShine from "@/components/gold-shine";
import { cellAt, cellIndex, DIRECTIONS, type GameMap } from "@/lib/robot-map";

const DIRECTION_HU: Record<string, string> = { north: "észak", west: "nyugat", south: "dél", east: "kelet" };

type Props = {
  map: GameMap;
  robot?: GameMap["robot"];
  gold?: boolean[];
  /** Futás utáni állapot; ha hiányzik, csak a robot kezdőmezője felfedezett. */
  explored?: boolean[];
  caption?: string;
  cell?: number;
  /** Akadálymentes leírás; ha hiányzik, a dokumentáció magyar leírása (méret, robot helye és iránya). */
  label?: string;
  /** Csillogó arany, mint a szimulátorban (a kezdőlapon és a térkép oldalán); a dokumentációban álló kép. */
  shine?: boolean;
};

export function MiniMap({
  map,
  robot = map.robot,
  gold = map.gold,
  explored,
  caption,
  cell = 24,
  label,
  shine = false,
}: Props) {
  const robotIndex = cellIndex(map, robot.x, robot.y);
  const facing = DIRECTION_HU[DIRECTIONS[robot.dir].name];
  const description =
    label ??
    `${map.rows}×${map.cols} térkép, a robot a ${robot.y + 1}. sor ${robot.x + 1}. oszlopában áll, ${facing} felé néz.`;

  return (
    <figure className="m-0 flex shrink-0 flex-col items-center gap-1.5">
      <div
        role="img"
        aria-label={description}
        className="pixel-map grid border-2 border-border"
        style={{ gridTemplateColumns: `repeat(${map.cols}, ${cell}px)` }}
      >
        {map.walls.map((wall, index) => {
          const seen = explored ? explored[index] : index === robotIndex;
          const tile = mapTile(wall, seen);
          return (
            <div
              key={index}
              aria-hidden
              className="pixel-sprite relative"
              style={{ ...tileBackground(tile), width: cell, height: cell }}
            >
              {!wall &&
                gold[index] &&
                (shine ? <GoldShine {...cellAt(map, index)} /> : <span className="gold-sprite absolute inset-0" />)}
              {index === robotIndex && <RobotSprite className="absolute inset-0" style={robotSpriteStyle(robot.dir)} />}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="font-read text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
