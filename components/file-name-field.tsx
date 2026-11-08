"use client";

// Kis, szerkeszthető fájlnév-mező a szerkesztők fejlécébe: a név, és mögötte a rögzített kiterjesztés.
// A program- és a térképszerkesztő is ezt használja, hogy a két mező mérete és viselkedése azonos legyen.

import { Input } from "@/components/ui/input";
import { DEFAULT_FILE_NAME, MAX_FILE_NAME_LENGTH } from "@/lib/file-names";

type Props = {
  id: string;
  /** Akadálymentes név (a felület nyelvén). */
  label: string;
  /** A név kiterjesztés nélkül. */
  value: string;
  /** A rögzített, nem szerkeszthető kiterjesztés, pl. „.mine”. */
  extension: string;
  onChange: (value: string) => void;
};

export default function FileNameField({ id, label, value, extension, onChange }: Props) {
  const extensionId = `${id}-extension`;
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1 font-mono text-xs">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onChange(value.trim() || DEFAULT_FILE_NAME)}
        placeholder={DEFAULT_FILE_NAME}
        maxLength={MAX_FILE_NAME_LENGTH}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={extensionId}
        className="h-7 w-28 px-2 font-mono text-xs md:text-xs"
      />
      <span id={extensionId} className="shrink-0 text-muted-foreground">
        {extension}
      </span>
    </div>
  );
}
