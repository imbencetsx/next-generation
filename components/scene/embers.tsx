// Felszálló parázs: arany és narancs pixelek emelkednek a szülő aljáról, közben jobbra-balra lengenek és pislognak.
// A szülő adja a helyet (position: relative) és az emelkedés magasságát (--ember-rise). Díszítés; csökkentett
// mozgásnál rejtett (app/globals.css).

import type { CSSProperties } from "react";

/** Parázsszemek: kiindulás a szülő szélességének %-ában, egy emelkedés ideje, kezdőfázis (0–1) és oldalra lengés. */
const EMBERS = [
  { x: 6, seconds: 7, phase: 0.1, drift: 18 },
  { x: 13, seconds: 9, phase: 0.55, drift: -12 },
  { x: 22, seconds: 8, phase: 0.3, drift: 24 },
  { x: 31, seconds: 10, phase: 0.8, drift: -20 },
  { x: 39, seconds: 7.5, phase: 0.05, drift: 14 },
  { x: 47, seconds: 9.5, phase: 0.65, drift: -16 },
  { x: 56, seconds: 8.5, phase: 0.4, drift: 22 },
  { x: 64, seconds: 7, phase: 0.9, drift: -10 },
  { x: 72, seconds: 10.5, phase: 0.2, drift: 18 },
  { x: 80, seconds: 8, phase: 0.7, drift: -22 },
  { x: 88, seconds: 9, phase: 0.35, drift: 12 },
  { x: 95, seconds: 7.8, phase: 0.6, drift: -14 },
] as const;

export default function Embers() {
  return (
    <div aria-hidden className="embers">
      {EMBERS.map((ember, index) => (
        // A parázsszemek rögzítettek, az index stabil kulcs.
        <i
          key={index}
          className="ember"
          data-tone={index % 3}
          style={{
            left: `${ember.x}%`,
            animationDuration: `${ember.seconds}s, ${ember.seconds / 7}s`,
            animationDelay: `${-ember.phase * ember.seconds}s, 0s`,
            ...({ "--drift": `${ember.drift}px` } as CSSProperties),
          }}
        />
      ))}
    </div>
  );
}
