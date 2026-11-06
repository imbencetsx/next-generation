// A bejelentkezés jelenete: bánya-folyosó a játék sprite-jaiból, a robot helyben sétál és buborékban szól a játékoshoz.

import type { CSSProperties } from "react";

const TILES = ["wall", "empty-dirt", "empty-dirt", "empty-dirt", "full_dirt", "full_dirt", "wall"] as const;
const ROBOT_AT = 1;
const GOLD_AT = 3;
// A jobbra néző sor (3. sor) talppárnái a robot_sheet képkockáin, pixelben (lásd pixel-map.tsx).
const FOOT = [5, 4, 4, 4].map((px) => `${(px / 32) * 100}%`);

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
      <div aria-hidden className="flex border-2 border-foreground shadow-[0_4px_0_var(--foreground)]">
      {TILES.map((tile, index) => (
        <div key={index} className="pixel-sprite relative size-12 sm:size-14" style={{ backgroundImage: `url(/sprites/${tile}.png)` }}>
          {index === GOLD_AT && (
            <span className="gold-shine">
              <i className="chips" />
              <i className="shine-down-half" />
              <i className="shine-down" />
              <i className="shine-up-half" />
              <i className="shine-up" />
            </span>
          )}
          {index === ROBOT_AT && (
            <div
              className="pixel-robot-sprite absolute inset-0"
              style={{
                backgroundPosition: "0% 66.6667%",
                animation: "robot-walk 0.48s step-end infinite",
                "--robot-foot-idle": FOOT[0],
                "--robot-foot-walk-1": FOOT[1],
                "--robot-foot-walk-2": FOOT[2],
                "--robot-foot-walk-3": FOOT[3],
              } as CSSProperties}
            />
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
