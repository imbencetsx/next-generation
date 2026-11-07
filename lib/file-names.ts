// Szerkeszthető fájlnevek: a felhasználó csak a nevet írja, a kiterjesztés rögzített (.mine vagy .map).
// A program- és a térképszerkesztő ugyanezt használja, így a két mező ugyanúgy viselkedik.

/** Ez a név kerül a fájlra, ha a felhasználó üresen hagyja. */
export const DEFAULT_FILE_NAME = "untitled";
export const MAX_FILE_NAME_LENGTH = 100;

/**
 * A szerkeszthető név egy fájlnévből vagy beírt szövegből: a felsorolt kiterjesztés nélkül (betűmérettől
 * függetlenül), a fájlnévben tiltott jelek (/ \ : * ? " < > |) és vezérlőkarakterek nélkül, legfeljebb 100 karakter.
 */
export function fileBaseName(text: string, extensions: readonly string[]): string {
  const lower = text.toLowerCase();
  const extension = extensions.find((candidate) => lower.endsWith(candidate));
  return (extension ? text.slice(0, -extension.length) : text)
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, "")
    .slice(0, MAX_FILE_NAME_LENGTH);
}

/** A letöltött fájl neve: a név és a rögzített kiterjesztés. Üres névnél „untitled”. */
export function fileNameWith(name: string, extension: string): string {
  return `${name.trim() || DEFAULT_FILE_NAME}${extension}`;
}
