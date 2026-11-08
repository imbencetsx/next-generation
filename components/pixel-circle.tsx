// Pixeles kör: a profilkép lépcsős körkivágása, fénnyel a bal felső és árnyékkal a jobb alsó szélén.
// A profilkép (auth/avatar.tsx) és a ranglista érmei (map-page/medal.tsx) is ezt használják.
// A keret és a fények ugyanazon a 32×32-es rácson ülnek, mint a profilkép pixelei.

import type { CSSProperties, ReactNode } from "react";

const ROW_INSET = [12, 12, 8, 8, 6, 6, 4, 4, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 4, 4, 6, 6, 8, 8, 12, 12];
const inside = (x: number, y: number) => y >= 0 && y < 32 && x >= ROW_INSET[y] && x < 32 - ROW_INSET[y];
const lighting = { edge: "", lightCorner: "", darkCorner: "" };
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    if (!inside(x, y)) continue;
    if (inside(x, y - 1) && inside(x - 1, y) && inside(x, y + 1) && inside(x + 1, y)) continue;
    const square = `M${x} ${y}h1v1h-1z`;
    lighting.edge += square;
    if (x < 12 && y < 12) lighting.lightCorner += square;
    else if (x >= 20 && y >= 20) lighting.darkCorner += square;
  }
}

type Props = {
  size: number;
  children: ReactNode;
  /** A kör belsejének stílusa, pl. az érem színe (alapból az --accent háttér). */
  faceStyle?: CSSProperties;
};

export default function PixelCircle({ size, children, faceStyle }: Props) {
  return (
    <span className="pixel-avatar display" style={{ width: size, height: size, fontSize: size / 2 }} aria-hidden>
      <span className="pixel-avatar-face" style={faceStyle}>
        {children}
      </span>
      <svg
        className="pixel-avatar-lighting"
        viewBox="0 0 32 32"
        shapeRendering="crispEdges"
        aria-hidden
        focusable="false"
      >
        <path d={lighting.darkCorner} className="pixel-avatar-dark-edge" transform="translate(1 1)" />
        <path d={lighting.edge} className="pixel-avatar-edge" />
        <path d={lighting.lightCorner} className="pixel-avatar-light-edge" />
        <path d={lighting.darkCorner} className="pixel-avatar-dark-edge" />
      </svg>
    </span>
  );
}
