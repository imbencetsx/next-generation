// Egy feldolgozott sor látványelemei: ásáskor földrögök repülnek, bányászáskor aranyszilánkok, falba
// ütközéskor szikrázik, print-nél szövegbuborék jelenik meg a robot fölött,
// a sikeres futás végén csillagok szállnak. Minden sorhoz újra felépül (a kulcsa a mozgás azonosítója), és csak
// CSS-animáció; csökkentett mozgás beállításnál rejtett (app/globals.css). A konzol és a felolvasó szöveg ugyanezt
// írásban is közli, ez csak díszítés.

import type { CSSProperties } from "react";
import type { Motion } from "@/components/robot-motion";
import { cellAt, DIRECTIONS, type GameMap } from "@/lib/robot-map";

type Kind = "dirt" | "gold" | "spark" | "star";

/** Darabszám, repülési távolság (mezőben) és a szórás szöge (fokban, 360 = minden irányba). */
const BURSTS: Record<Kind, { pieces: number; reach: number; spread: number }> = {
  dirt: { pieces: 6, reach: 0.55, spread: 360 },
  gold: { pieces: 9, reach: 0.75, spread: 360 },
  spark: { pieces: 7, reach: 0.6, spread: 150 },
  star: { pieces: 12, reach: 1.1, spread: 360 },
};
/** A buborékba írt érték legnagyobb hossza; a hosszabbat levágjuk (a konzolban teljes). */
const BUBBLE_MAX_CHARS = 10;
/** Darabonként kissé eltérő távolság, hogy a szórás ne legyen tökéletes kör. */
const REACH_JITTER = [1, 0.7, 0.9, 0.6, 1.05, 0.8];

type Props = { map: GameMap; robot: GameMap["robot"]; motion: Motion };

export function MapEffects({ map, robot, motion }: Props) {
  const ahead = DIRECTIONS[robot.dir];

  return (
    <div aria-hidden className="map-effects">
      {motion.reveals.map(({ index, at }) => (
        <Burst key={index} kind="dirt" {...cellAt(map, index)} delay={at} />
      ))}
      {motion.mined !== null && <Mined {...cellAt(map, motion.mined)} />}
      {motion.bump && (
        // A szikra a robot és az előtte lévő fal határán pattan, visszafelé.
        <Burst
          kind="spark"
          x={robot.x + ahead.dx / 2}
          y={robot.y + ahead.dy / 2}
          facing={Math.atan2(-ahead.dy, -ahead.dx)}
        />
      )}
      {motion.printed !== null && <Bubble x={robot.x} y={robot.y} text={motion.printed} />}
      {motion.finished && <Burst kind="star" x={robot.x} y={robot.y} />}
    </div>
  );
}

/** Egy mezőnyi doboz a mező helyén; a gyerekei a közepéhez igazodnak. */
function At({ x, y, className, children }: { x: number; y: number; className?: string; children?: React.ReactNode }) {
  return (
    <span className={`fx-cell ${className ?? ""}`} style={{ "--x": x, "--y": y } as CSSProperties}>
      {children}
    </span>
  );
}

type BurstProps = { kind: Kind; x: number; y: number; delay?: number; facing?: number };

function Burst({ kind, x, y, delay = 0, facing = 0 }: BurstProps) {
  const { pieces, reach, spread } = BURSTS[kind];
  const spreadRadians = (spread * Math.PI) / 180;
  return (
    <At x={x} y={y}>
      {Array.from({ length: pieces }, (_, piece) => {
        // Teljes körnél egyenletesen körbe, legyezőnél a facing irány körül.
        const share = spread === 360 ? piece / pieces : piece / (pieces - 1) - 0.5;
        const angle = facing + share * spreadRadians;
        const distance = reach * REACH_JITTER[piece % REACH_JITTER.length];
        return (
          <i
            key={piece}
            className="fx-piece"
            data-kind={kind}
            data-tone={piece % 3}
            style={
              {
                "--dx": (Math.cos(angle) * distance).toFixed(3),
                "--dy": (Math.sin(angle) * distance).toFixed(3),
                "animationDelay": `${delay}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </At>
  );
}

function Mined({ x, y }: { x: number; y: number }) {
  return (
    <>
      <At className="fx-flash" x={x} y={y} />
      <Burst kind="gold" x={x} y={y} />
    </>
  );
}

function Bubble({ x, y, text }: { x: number; y: number; text: string }) {
  const shown = text.length > BUBBLE_MAX_CHARS ? `${text.slice(0, BUBBLE_MAX_CHARS - 1)}…` : text;
  return (
    // A legfelső sorban a buborék a robot alá kerül, hogy ne takarja a vonalzót.
    <At x={x} y={y}>
      <span className="fx-bubble" data-below={y === 0 || undefined}>
        {shown}
      </span>
    </At>
  );
}
