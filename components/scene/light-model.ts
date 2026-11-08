// A pixeles „zseblámpa” modellje: a robot maga előtt világít, mintha lámpát tartana. A fény a robot elejéből indul,
// előre tágul és a távolsággal halványul; a robot körül csak egy halvány derengés van, mögötte sötét.
// A kép kis felbontású (LIGHT_RES pixel mezőnként, a 32-es sprite 4 pixele), amit a felület élesen nagyít fel
// (components/scene/pixel-light.tsx), és az erősség néhány tiszta lépcsőben változik, mint a régi játékokban.
// Tiszta függvények, React és DOM nélkül.

/** Fénypixel mezőnként: 8 → egy fénypixel a 32 px-es sprite 4 pixele. */
export const LIGHT_RES = 8;

/** A sötétség lépcsőinek száma (0 = teljes fény) és a legsötétebb lépcső átlátszatlansága. */
const LEVELS = 5;
const MAX_DARKNESS = 0.7;

/** Derengés a robot körül (mezőben): eddig a sugárig ekkora sötétség, hogy a robot és a szomszédja látsszon. */
const GLOW = [
  { radius: 0.55, darkness: 0.2 },
  { radius: 0.95, darkness: 0.5 },
  { radius: 1.35, darkness: 0.75 },
] as const;

/** A fénysugár: a robot közepétől ennyivel előrébb indul (a „kéz”), ilyen széles ott, és ennyire tágul. */
const BEAM_START = 0.3;
const BEAM_START_HALF_WIDTH = 0.3;
const BEAM_SPREAD = Math.tan((24 * Math.PI) / 180);
/** Ennyi mezőnyi távolságban halványul el teljesen; a szélénél (a szélesség e hányadától) sötétebb. */
const BEAM_REACH = 7;
const BEAM_EDGE = 0.7;
const BEAM_EDGE_DARKNESS = 0.5;

/** A sugár meleg fénye a robothoz közel, a sugár közepén: meddig ér, a lépcsők átlátszatlansága és a színek. */
const WARM_REACH = 3.5;
const WARM_ALPHA = [0, 0.05, 0.08] as const;
const DARK_RGB = [10, 5, 4] as const;
const WARM_RGB = [240, 167, 0] as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A fényforrás: helye mezőben (a bal felső saroktól, törtrész is lehet) és a nézési iránya radiánban (0 = kelet, y lefelé). */
export type LightSource = { x: number; y: number; facing: number };

type BeamPoint = { along: number; edge: number };

/** Hol van egy pont a sugárhoz képest: mennyire elöl (mezőben), és a tengelytől a sugár fél szélességének hányadában. */
function beamPoint(source: LightSource, x: number, y: number): BeamPoint | null {
  const forward = { x: Math.cos(source.facing), y: Math.sin(source.facing) };
  const dx = x - source.x;
  const dy = y - source.y;
  const along = dx * forward.x + dy * forward.y - BEAM_START;
  if (along < 0) return null;
  const across = Math.abs(dx * forward.y - dy * forward.x);
  const edge = across / (BEAM_START_HALF_WIDTH + along * BEAM_SPREAD);
  return edge > 1 ? null : { along, edge };
}

/** Sötétség 0 (fény) és 1 (teljes sötét) között egy pontban, mezőegységben. */
export function darknessAt(source: LightSource, x: number, y: number): number {
  const distance = Math.hypot(x - source.x, y - source.y);
  const glow = GLOW.find((ring) => distance <= ring.radius)?.darkness ?? 1;
  const beam = beamPoint(source, x, y);
  if (!beam) return glow;
  const fade = clamp01(beam.along / BEAM_REACH);
  const edge = clamp01((beam.edge - BEAM_EDGE) / (1 - BEAM_EDGE));
  return Math.min(glow, clamp01(fade + edge * BEAM_EDGE_DARKNESS));
}

/** A meleg fény lépcsője (0 = nincs) egy pontban: a sugár elején, a tengely közelében. */
function warmthAt(source: LightSource, x: number, y: number): number {
  const beam = beamPoint(source, x, y);
  if (!beam || beam.edge > BEAM_EDGE) return 0;
  const strength = 1 - beam.along / WARM_REACH;
  return strength <= 0 ? 0 : Math.ceil(strength * (WARM_ALPHA.length - 1));
}

/** A fény képe cols × rows mezőre (RGBA bájtok, LIGHT_RES pixel mezőnként). */
export function lightPixels(cols: number, rows: number, source: LightSource): Uint8ClampedArray<ArrayBuffer> {
  const width = cols * LIGHT_RES;
  const height = rows * LIGHT_RES;
  const pixels = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const x = (px + 0.5) / LIGHT_RES;
      const y = (py + 0.5) / LIGHT_RES;
      const at = (py * width + px) * 4;
      // Tiszta lépcsők: a sötétséget a legközelebbi szintre kerekítjük.
      const level = Math.round(darknessAt(source, x, y) * LEVELS);
      if (level > 0) {
        pixels.set([...DARK_RGB, Math.round((level / LEVELS) * MAX_DARKNESS * 255)], at);
        continue;
      }
      const warm = warmthAt(source, x, y);
      if (warm > 0) pixels.set([...WARM_RGB, Math.round(WARM_ALPHA[warm] * 255)], at);
    }
  }
  return pixels;
}
