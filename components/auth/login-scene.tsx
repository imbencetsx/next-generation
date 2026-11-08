// A bejelentkezés jelenete: bánya-folyosó a játék sprite-jaiból, a robot helyben sétál és buborékban szól a játékoshoz.
// A folyosó sötét, a robot lámpája világítja be előre, a fúrója szikrázik (components/scene/mine-light.tsx).

import RobotSprite from "@/components/robot-sprite";
import { DrillSparks, MineLight } from "@/components/scene/mine-light";
import { robotSpriteStyle, tileBackground, TILES } from "@/components/sprites";

/** A folyosó mezői balról jobbra: fal, három kiásott mező, két tömör föld, fal. */
const CORRIDOR = [TILES.wall, TILES.dug, TILES.dug, TILES.dug, TILES.solid, TILES.solid, TILES.wall];
const ROBOT_AT = 1;
const GOLD_AT = 3;
/** Kelet felé néz (DIRECTIONS sorrendjében a 3.), a folyosó irányába. */
const FACING_EAST = 3;
/** Helyben járás: a robot-walk animáció egy ciklusa (három képkocka). */
const WALK_IN_PLACE = "robot-walk 0.48s step-end infinite";

export default function LoginScene({ message }: { message: string }) {
  return (
    <div className="flex w-fit flex-col">
      {/* Szövegbuborék; a pixeles farka a robot mezőjére mutat (2. mező közepe).
          A w-0 min-w-full miatt a folyosó szélességét veszi fel, és tördel, ahelyett hogy kiszélesítené. */}
      <div className="relative mb-4 w-0 min-w-full">
        <p aria-live="polite" className="bg-foreground px-4 py-3 text-[15px] leading-snug text-background">
          {message}
        </p>
        <span aria-hidden className="absolute top-full left-[66px] flex flex-col items-center sm:left-[78px]">
          <span className="h-1 w-3 bg-foreground" />
          <span className="h-1 w-2 bg-foreground" />
          <span className="h-1 w-1 bg-foreground" />
        </span>
      </div>
      <div
        aria-hidden
        className="relative isolate flex overflow-hidden border-2 border-foreground shadow-[0_4px_0_var(--foreground)] [--tile:3rem] sm:[--tile:3.5rem]"
      >
        {CORRIDOR.map((tile, index) => (
          // A folyosó rögzített, sosem változik, ezért az index stabil kulcs.
          <div key={index} className="pixel-sprite relative size-(--tile)" style={tileBackground(tile)}>
            {index === GOLD_AT && (
              <span className="gold-shine">
                <i className="gold-sprite gold-sparkle absolute inset-0" />
              </span>
            )}
            {index === ROBOT_AT && (
              <div className="absolute inset-0 z-[3]">
                <RobotSprite
                  className="absolute inset-0"
                  style={{ ...robotSpriteStyle(FACING_EAST), animation: WALK_IN_PLACE }}
                />
                <DrillSparks />
              </div>
            )}
          </div>
        ))}
        <MineLight cols={CORRIDOR.length} rows={1} robot={{ x: ROBOT_AT, y: 0 }} />
      </div>
    </div>
  );
}
