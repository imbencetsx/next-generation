// A felhasználó profilképe a pixeles körben; kép híján a neve kezdőbetűje.

import Image from "next/image";
import PixelCircle from "@/components/pixel-circle";

export default function Avatar({
  name,
  imageUrl,
  size = 28,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
}) {
  return (
    <PixelCircle size={size}>
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={size} height={size} unoptimized className="size-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </PixelCircle>
  );
}
