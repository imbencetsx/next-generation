// A PNG fájl fejlécének minimális olvasása: csak annyi, hogy a méretét ellenőrizni tudjuk a kép dekódolása nélkül.
//
// Felépítés: 8 bájtos aláírás, majd az első blokk, az IHDR: 4 bájt hossz (mindig 13), 4 bájt név („IHDR”),
// utána a szélesség és a magasság 4–4 bájton (big-endian). Egy érvényes PNG ennél rövidebb nem lehet.

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const IHDR_LENGTH_AND_NAME = [0, 0, 0, 13, 73, 72, 68, 82];
const EXPECTED_START = [...SIGNATURE, ...IHDR_LENGTH_AND_NAME];
const WIDTH_OFFSET = 16;
const HEIGHT_OFFSET = 20;
/** Aláírás (8) + IHDR blokk (4 hossz + 4 név + 13 adat + 4 ellenőrzőösszeg). */
const MIN_PNG_BYTES = 33;

/** A PNG kép mérete pixelben, vagy null, ha a bájtok nem egy PNG fejlécével kezdődnek. */
export function pngSize(image: ArrayBuffer): { width: number; height: number } | null {
  if (image.byteLength < MIN_PNG_BYTES) return null;
  const bytes = new Uint8Array(image);
  if (!EXPECTED_START.every((byte, index) => bytes[index] === byte)) return null;

  const view = new DataView(image);
  const width = view.getUint32(WIDTH_OFFSET, false);
  const height = view.getUint32(HEIGHT_OFFSET, false);
  return width > 0 && height > 0 ? { width, height } : null;
}
