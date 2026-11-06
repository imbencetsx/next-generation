import Image from "next/image";

// public/logo.svg: 52×28-as pixel art. Az alapértelmezett 1,5× Retina kijelzőn pontosan 3 eszközpixel művészi pixelenként.
const WIDTH = 52;
const HEIGHT = 28;

export default function Logo({ scale = 1.5, className }: { scale?: number; className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt="MineScript"
      width={WIDTH * scale}
      height={HEIGHT * scale}
      unoptimized
      priority
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
