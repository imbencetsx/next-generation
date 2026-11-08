"use client";

// Pixeles lámpafény: a light-model.ts kis felbontású képét egy vásznon rajzolja ki, amit a CSS élesen (pixelated)
// nyújt a megadott méretre. A szimulátor, a kezdőlap és a bejelentkezés robotja is ezzel világít, így mindhárom fény
// egyforma. A fény egyenletes, nem vibrál. Díszítés, a felolvasók kihagyják.

import { useEffect, useRef, type CSSProperties } from "react";
import { LIGHT_RES, lightPixels, type LightSource } from "./light-model";

type Props = {
  /** A megvilágított terület mérete mezőben. */
  cols: number;
  rows: number;
  source: LightSource;
  className?: string;
  style?: CSSProperties;
};

export default function PixelLight({ cols, rows, source, className = "", style }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { x, y, facing } = source;

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const pixels = lightPixels(cols, rows, { x, y, facing });
    context.putImageData(new ImageData(pixels, cols * LIGHT_RES, rows * LIGHT_RES), 0, 0);
  }, [cols, rows, x, y, facing]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      width={cols * LIGHT_RES}
      height={rows * LIGHT_RES}
      className={`pixel-light ${className}`}
      style={style}
    />
  );
}
