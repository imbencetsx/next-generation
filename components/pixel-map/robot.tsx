// A robot: a pozíciója lépcsőzetes átmenettel csúszik, közben a járásanimáció fut; álló helyzetben pihegve
// fel-le billeg. A fénye (lighting.tsx) ugyanezzel az átmenettel követi.

import RobotSprite from "@/components/robot-sprite";
import type { CSSProperties } from "react";
import type { Motion } from "@/components/robot-motion";
import { robotSpriteStyle } from "@/components/sprites";
import type { GameMap } from "@/lib/robot-map";

/** A járásanimáció képkockái a sprite-lapon (az álló kép nélkül). */
const WALK_FRAMES = 3;
/** Mezőnként ennyi ugrással lép a robot (32 px-es sprite-nál 8 pixelenként), hogy ne simán csússzon. */
const JUMPS_PER_CELL = 4;

/** Hány ugrással teszi meg a robot a mostani mozgást. */
export const jumpsOf = (motion: Motion | null) => (motion?.cells ?? 0) * JUMPS_PER_CELL;

/** A robottal együtt mozgó rétegek átmenete: ugyanannyi idő, ugyanannyi lépcső. */
export function slideTransition(motion: Motion | null): CSSProperties {
  return {
    transitionDuration: `${motion?.duration ?? 0}ms`,
    transitionTimingFunction: `steps(${Math.max(1, jumpsOf(motion))}, end)`,
  };
}

/** Egy mező bal felső sarkába tolás (a robot és a hozzá igazított rétegek helye). */
export const cellOffset = (x: number, y: number, cell: number) => `translate(${x * cell}px, ${y * cell}px)`;

type Props = { robot: GameMap["robot"]; cell: number; motion: Motion | null };

export function Robot({ robot, cell, motion }: Props) {
  const jumps = jumpsOf(motion);
  const walking: CSSProperties = motion?.cells
    ? {
        animationName: "robot-walk",
        // Egy teljes járásciklus WALK_FRAMES ugrásig tart; a ciklus annyiszor fut, ahány ugrás van.
        animationDuration: `${(motion.duration / jumps) * WALK_FRAMES}ms`,
        animationIterationCount: jumps / WALK_FRAMES,
      }
    : {};

  return (
    <div
      aria-hidden
      className="pixel-robot"
      data-moving={motion?.cells ? true : undefined}
      data-cheer={motion?.finished ? true : undefined}
      style={{ width: cell, height: cell, transform: cellOffset(robot.x, robot.y, cell), ...slideTransition(motion) }}
    >
      <RobotSprite
        // Új mozgásnál újraindul a járás; megálláskor (az animáció végén) visszaáll az álló képkockára.
        key={motion?.id ?? "idle"}
        className="h-full w-full"
        style={{ ...robotSpriteStyle(robot.dir), ...walking }}
      />
    </div>
  );
}

/**
 * A „szellem”: az 1. helyezett robotja áttetszőn, szürkén, egy kis „#1” címkével. Nem jár (nincs járásanimáció),
 * csak rövid lépcsős átmenettel csúszik a következő helyére, és a játékos robotja alatt marad. Díszítés: a térkép
 * alatti felirat írja le szövegesen (simulator.tsx).
 */
export function GhostRobot({ robot, label, cell }: { robot: GameMap["robot"]; label: string; cell: number }) {
  return (
    <div
      aria-hidden
      className="pixel-ghost"
      style={{ width: cell, height: cell, transform: cellOffset(robot.x, robot.y, cell) }}
    >
      <RobotSprite className="h-full w-full" style={robotSpriteStyle(robot.dir)} />
      <span className="pixel-ghost-label">{label}</span>
    </div>
  );
}
