// Egy térképmező. Alul a mező képe (fal / kiásott / tömör föld), fölötte mozgás közben egy takaró tömör föld,
// ami a robot érkezésekor tűnik el, legfelül az arany.

import type { CSSProperties } from "react";
import { mapTile, shineDelay, tileBackground, TILES } from "@/components/sprites";

type Props = {
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

export function MapTile({ x, y, wall, explored, gold, fog, revealAt, motionId }: Props) {
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
