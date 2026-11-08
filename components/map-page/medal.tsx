// Érem a ranglista első három helyéhez: a profilkép pixeles köre arany, ezüst vagy bronz színben, benne a helyezés.
// A helyezést szövegként is kiírjuk (a felolvasóknak), az érem maga díszítés.

import PixelCircle from "@/components/pixel-circle";

const MEDAL_COLORS = ["var(--medal-gold)", "var(--medal-silver)", "var(--medal-bronze)"];

/** Az érmes helyezések száma (1., 2., 3.). */
export const MEDAL_PLACES = MEDAL_COLORS.length;

export default function Medal({ place, size = 28 }: { place: number; size?: number }) {
  return (
    <PixelCircle size={size} faceStyle={{ background: MEDAL_COLORS[place - 1], color: "var(--medal-ink)" }}>
      {place}
    </PixelCircle>
  );
}
