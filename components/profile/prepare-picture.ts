// Profilkép előkészítése a böngészőben: négyzetes kivágás, egy sprite-mezőnyi felbontás és csökkentett
// paletta, hogy a kép a játék pixel artjához illeszkedjen. A szerver a PNG fejlécét és méretkorlátait ellenőrzi
// (convex/profileRules.ts: validAvatar); az átalakítás a böngésző feladata.

import { TILE } from "@/components/sprites";
import { MAX_AVATAR_SOURCE_BYTES } from "@/convex/profileRules";

/** Az avatar oldalhossza pixelben: akkora, mint egy sprite-mező. */
const PIXELS = TILE;
/** Színcsatornánként nyolc érték, a 0 és 255 közötti hét egyenlő lépéssel. */
const COLOR_STEPS = 7;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Hibás vagy túl nagy fájlnál kivételt dob; a hívó ezt „image” hibaként jeleníti meg. */
export async function preparePicture(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new Error("Unsupported image type or source file too large.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PIXELS;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas drawing is unavailable.");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PIXELS, PIXELS);
    const image = context.getImageData(0, 0, PIXELS, PIXELS);
    for (let index = 0; index < image.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) {
        image.data[index + channel] =
          (Math.round((image.data[index + channel] * COLOR_STEPS) / 255) * 255) / COLOR_STEPS;
      }
    }
    context.putImageData(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed."))), "image/png"),
    );
  } finally {
    bitmap.close();
  }
}
