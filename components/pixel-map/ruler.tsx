// Számozott vonalzó a térkép mellett: felül vízszintes gerenda az oszlopokkal, bal oldalt függőleges dúc a sorokkal
// (public/sprites/timber-*.png, scripts/draw-mine-timber.py). A robot oszlopa és sora aranyszínnel világít, és egy
// nyíl mutat be a térképre. A számok 1-től indulnak, mint a térkép felolvasott címkéjében. Díszítés: a robot helyét
// a térkép címkéje már felolvassa, ezért a felolvasók kihagyják.

type Props = { axis: "columns" | "rows"; count: number; active: number };

export function Ruler({ axis, count, active }: Props) {
  return (
    <div aria-hidden className="map-ruler" data-axis={axis}>
      {Array.from({ length: count }, (_, index) => (
        // A vonalzó hossza a térképpel együtt változik, a sorrend sosem; az index stabil kulcs.
        <span key={index} className="pixel-sprite map-ruler-plate" data-active={index === active || undefined}>
          {index + 1}
        </span>
      ))}
    </div>
  );
}
