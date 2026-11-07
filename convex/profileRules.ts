// A profilhoz tartozó korlátok és fordítható hibakódok.
import { ConvexError } from "convex/values";

export const MAX_AVATAR_BYTES = 1024 * 1024;
export const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;
export const AVATAR_SIZE = 256;

export const PROFILE_ERRORS = ["unauthenticated", "username", "taken", "password", "currentPassword", "locked", "conflict", "image", "generic"] as const;
export type ProfileErrorKey = typeof PROFILE_ERRORS[number];

export function profileError(key: ProfileErrorKey): never {
  throw new ConvexError(`PROFILE_${key}`);
}

export function profileErrorKey(error: unknown): ProfileErrorKey {
  const message = error instanceof ConvexError ? String(error.data) : error instanceof Error ? error.message : "";
  return PROFILE_ERRORS.find((key) => message.includes(`PROFILE_${key}`)) ?? "generic";
}

export function validAvatar(image: ArrayBuffer): boolean {
  if (image.byteLength < 33 || image.byteLength > MAX_AVATAR_BYTES) return false;
  const bytes = new Uint8Array(image);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82];
  if (!signature.every((byte, index) => bytes[index] === byte)) return false;
  const view = new DataView(image);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && width <= AVATAR_SIZE && height > 0 && height <= AVATAR_SIZE;
}
