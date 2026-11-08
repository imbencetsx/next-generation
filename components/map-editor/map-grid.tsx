"use client";

// A rajzolt, szerkeszthető térkép. Minden mező egy gomb: kattintásra (vagy lenyomott egérrel áthúzva) a
// kiválasztott ecsettel fest. Billentyűzettel a nyilakkal, Home/End-del (Ctrl-lal a sarkokba) lehet mozogni,
// és mindig csak egy mező van a Tab-sorrendben (roving tabindex).

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { robotSpriteStyle, tileBackground, TILES } from "@/components/sprites";
import { useI18n } from "@/i18n/i18n-provider";
import { cellIndex, type GameMap } from "@/lib/robot-map";
import type { MapTool } from "@/lib/map-editor";

/** Ennél kisebbre nem zsugorodik egy mező; szűk helyen a térkép inkább görgethető. */
const MIN_CELL = 24;
/** A térkép körüli belső margó (p-4 mindkét oldalon). */
const CANVAS_PADDING = 32;

/** Egy mező képe a játék sprite-jaiból; az ecsetválasztó gombokon is ez látszik. */
export function CellArtwork({ kind, direction = 3 }: { kind: MapTool; direction?: GameMap["robot"]["dir"] }) {
  return (
    <span
      aria-hidden
      className="pixel-sprite relative block size-full"
      style={tileBackground(kind === "wall" ? TILES.wall : TILES.dug)}
    >
      {kind === "gold" && <span className="gold-sprite gold-sparkle absolute inset-0" />}
      {kind === "robot" && <span className="pixel-robot-sprite absolute inset-0" style={robotSpriteStyle(direction)} />}
    </span>
  );
}

type Props = { map: GameMap; disabled: boolean; onPaint: (x: number, y: number) => void };

export default function MapGrid({ map, disabled, onPaint }: Props) {
  const { t } = useI18n();
  const viewport = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [focused, setFocused] = useState(0);
  const activeIndex = Math.min(focused, map.rows * map.cols - 1);

  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const cell = Math.max(
    MIN_CELL,
    Math.floor(Math.min((size.width - CANVAS_PADDING) / map.cols, (size.height - CANVAS_PADDING) / map.rows)),
  );

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const x = index % map.cols;
    const y = Math.floor(index / map.cols);
    let target = index;
    if (event.key === "ArrowLeft") target = cellIndex(map, Math.max(0, x - 1), y);
    else if (event.key === "ArrowRight") target = cellIndex(map, Math.min(map.cols - 1, x + 1), y);
    else if (event.key === "ArrowUp") target = cellIndex(map, x, Math.max(0, y - 1));
    else if (event.key === "ArrowDown") target = cellIndex(map, x, Math.min(map.rows - 1, y + 1));
    else if (event.key === "Home") target = event.ctrlKey ? 0 : cellIndex(map, 0, y);
    else if (event.key === "End") target = event.ctrlKey ? map.rows * map.cols - 1 : cellIndex(map, map.cols - 1, y);
    else return;
    event.preventDefault();
    grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${target}"]`)?.focus();
  }

  return (
    <div ref={viewport} className="min-h-[320px] flex-1 overflow-auto bg-background">
      <div className="grid min-h-full min-w-full w-max place-items-center p-4">
        <div
          ref={grid}
          role="grid"
          aria-label={t.mapEditor.visual}
          aria-rowcount={map.rows}
          aria-colcount={map.cols}
          aria-describedby="map-keyboard-hint"
          className="grid"
          style={{ width: cell * map.cols, gridTemplateColumns: `repeat(${map.cols}, ${cell}px)` }}
        >
          {Array.from({ length: map.rows }, (_, y) => (
            <div role="row" key={y} className="contents">
              {Array.from({ length: map.cols }, (_, x) => {
                const index = cellIndex(map, x, y);
                const isRobot = x === map.robot.x && y === map.robot.y;
                const kind: MapTool = isRobot
                  ? "robot"
                  : map.walls[index]
                    ? "wall"
                    : map.gold[index]
                      ? "gold"
                      : "empty";
                const description = isRobot
                  ? `${t.mapEditor.toolNames.robot}, ${t.sim.directions[map.robot.dir]}`
                  : t.mapEditor.toolNames[kind];
                return (
                  <div role="gridcell" key={x}>
                    <button
                      type="button"
                      disabled={disabled}
                      tabIndex={index === activeIndex ? 0 : -1}
                      data-cell={index}
                      className="map-editor-cell"
                      style={{ width: cell, height: cell }}
                      aria-label={t.mapEditor.cell(y + 1, x + 1, description)}
                      onFocus={() => setFocused(index)}
                      onKeyDown={(event) => moveFocus(event, index)}
                      onClick={() => onPaint(x, y)}
                      onPointerDown={(event) => {
                        if (event.pointerType === "mouse" && event.button === 0) onPaint(x, y);
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse" && event.buttons === 1) onPaint(x, y);
                      }}
                    >
                      <CellArtwork kind={kind} direction={map.robot.dir} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
