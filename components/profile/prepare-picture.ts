import { MAX_AVATAR_SOURCE_BYTES } from "@/convex/profileRules";

const PIXELS = 32;
const COLOR_LEVELS = 7;

// Négyzetes kivágás és kis felbontás; a csökkentett paletta közelebb hozza a képet a játék sprite-jaihoz.
export async function preparePicture(file: File): Promise<Blob> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_AVATAR_SOURCE_BYTES) throw new Error("PROFILE_image");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PIXELS;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PROFILE_image");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PIXELS, PIXELS);
    const image = context.getImageData(0, 0, PIXELS, PIXELS);
    for (let index = 0; index < image.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) {
        image.data[index + channel] = Math.round(image.data[index + channel] * COLOR_LEVELS / 255) * 255 / COLOR_LEVELS;
      }
    }
    context.putImageData(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PROFILE_image")), "image/png"));
  } finally {
    bitmap.close();
  }
}
