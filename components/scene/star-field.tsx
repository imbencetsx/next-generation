// Pixeles éjszakai ég: pislákoló csillagok, és időnként egy hullócsillag húz át rajta. A szülő adja a helyet
// (position: relative); díszítés, a felolvasók kihagyják. Csökkentett mozgásnál a csillagok állnak (app/globals.css).

/** Csillagok: hely a szülő %-ában, méret (nagy = pluszjel alakú), és a pislákolás késleltetése másodpercben. */
const STARS = [
  { x: 4, y: 12, big: false, delay: 0.2 },
  { x: 9, y: 34, big: true, delay: 1.6 },
  { x: 15, y: 8, big: false, delay: 2.9 },
  { x: 21, y: 26, big: false, delay: 0.9 },
  { x: 27, y: 46, big: false, delay: 3.6 },
  { x: 32, y: 14, big: true, delay: 2.2 },
  { x: 38, y: 36, big: false, delay: 0.5 },
  { x: 44, y: 6, big: false, delay: 3.1 },
  { x: 49, y: 22, big: false, delay: 1.2 },
  { x: 55, y: 40, big: true, delay: 2.6 },
  { x: 61, y: 10, big: false, delay: 0.1 },
  { x: 66, y: 30, big: false, delay: 3.9 },
  { x: 72, y: 16, big: false, delay: 1.9 },
  { x: 77, y: 44, big: false, delay: 0.7 },
  { x: 83, y: 6, big: true, delay: 3.3 },
  { x: 88, y: 28, big: false, delay: 2.4 },
  { x: 93, y: 18, big: false, delay: 1.4 },
  { x: 97, y: 38, big: false, delay: 3.0 },
] as const;

export default function StarField() {
  return (
    <div aria-hidden className="star-field">
      {STARS.map((star, index) => (
        // A csillagok helye rögzített, az index stabil kulcs.
        <i
          key={index}
          className="star"
          data-big={star.big || undefined}
          style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.delay}s` }}
        />
      ))}
      <i className="shooting-star" />
    </div>
  );
}
