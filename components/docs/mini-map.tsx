import { DIRECTIONS, type GameMap } from "@/lib/robot-map";

const ROTATION = [0, -90, 180, 90]; // észak, nyugat, dél, kelet
const DIRECTION_HU: Record<string, string> = { north: "észak", west: "nyugat", south: "dél", east: "kelet" };

type Props = {
  map: GameMap;
  robot?: GameMap["robot"];
  gold?: boolean[];
  /** Ha megadjuk, a még fel nem fedezett mezők halványabban jelennek meg. */
  explored?: boolean[];
  caption?: string;
};

export function MiniMap({ map, robot = map.robot, gold = map.gold, explored, caption }: Props) {
  const label = `${map.rows}×${map.cols} térkép, a robot a(z) ${robot.y + 1}. sor ${robot.x + 1}. oszlopában áll, ${DIRECTION_HU[DIRECTIONS[robot.dir].name]} felé néz.`;
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <div
        role="img"
        aria-label={label}
        className="grid gap-px rounded border border-[var(--d-border)] bg-[var(--d-border)] p-px"
        style={{ gridTemplateColumns: `repeat(${map.cols}, 18px)` }}
      >
        {map.walls.map((wall, index) => {
          const x = index % map.cols;
          const y = Math.floor(index / map.cols);
          const isRobot = robot.x === x && robot.y === y;
          const dim = explored && !explored[index];
          return (
            <div
              key={index}
              aria-hidden
              className={`flex h-[18px] w-[18px] items-center justify-center text-[11px] leading-none ${
                wall ? "bg-[#3b4252] text-[#6b7385]" : "bg-[#1b2230]"
              } ${dim ? "opacity-40" : ""}`}
            >
              {wall && "#"}
              {!wall && isRobot && (
                <span className="inline-block text-[#7aa2f7]" style={{ transform: `rotate(${ROTATION[robot.dir]}deg)` }}>▲</span>
              )}
              {!wall && !isRobot && gold[index] && <span className="text-[#e3b341]">●</span>}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="text-xs text-[var(--d-muted)]">{caption}</figcaption>}
    </figure>
  );
}
