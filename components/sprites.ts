// A sprite-ok közös adatai (szerver- és kliensoldalon is importálható, ezért nincs "use client").

export const TILE = 32;
// robot_sheet.png: 4×4 képkocka (32×32). Oszlopok: áll, lépés 1–3. Sorok a képen: le, balra, jobbra, fel.
// Irány → sor (észak, nyugat, dél, kelet).
export const ROBOT_ROW = [3, 1, 0, 2];
// A talp alatti üres hely képkockánként eltér; ezt eltoljuk, hogy a robot a mező alján álljon.
// Irányonként: álló kép, majd a három járásképkocka, az eredeti sprite pixelméretében.
export const ROBOT_FOOT_PADDING = [
  [7, 7, 7, 7],
  [4, 3, 4, 3],
  [3, 2, 3, 2],
  [5, 4, 4, 4],
];
