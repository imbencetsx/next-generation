"use client";

// A kezdőlap fő eleme: a bányajárat robotja nagy betűkkel köszönti a játékost (pl. „Üdv vissza, név!”). A mondatot
// a szerver sorsolja (app/(home)/page.tsx), így a kliens ugyanazt rajzolja; nyelvváltáskor ugyanaz a mondat marad.
// A buborék felpattan, a mondat betűnként „gépelődik”; a teljes szöveg végig a DOM-ban van, a felolvasó egyben kapja.

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";
import MineStrip, { ROBOT_INDEX } from "./mine-strip";

/** A buborék pixeles farkának szélessége (a legszélesebb lépcsőfok), hogy a közepe a robot közepére essen. */
const TAIL_WIDTH = 12;
/** A járat keretének vastagsága; a mezők ennyivel beljebb kezdődnek. */
const STRIP_BORDER = 2;
/** Ennyi idő telik el két „legépelt” betű között. */
const TYPE_MS = 45;

export default function RobotGreeting({ greeting }: { greeting: number }) {
  const { t } = useI18n();
  const viewer = useQuery(api.users.viewer);
  const lines = t.home.greetings;
  const line = lines[greeting % lines.length];

  return (
    // A mezőméret egy helyen: a járat és a farok helye is ebből számol.
    <div className="[--tile:3rem] sm:[--tile:3.5rem]">
      <div className="relative mb-5 w-fit max-w-full">
        <h1 className="greeting-bubble min-h-[1.2em] bg-foreground px-5 py-4 font-pixel text-3xl leading-tight text-background sm:px-7 sm:text-5xl">
          {/* A név betöltéséig üres, de a magasságát megtartja, hogy a lap ne ugorjon. */}
          {viewer ? <Typed text={line(viewer.name)} /> : " "}
        </h1>
        <span
          aria-hidden
          className="absolute top-full flex flex-col items-center"
          style={{ left: `calc(${STRIP_BORDER}px + ${ROBOT_INDEX + 0.5} * var(--tile) - ${TAIL_WIDTH / 2}px)` }}
        >
          <span className="h-1 w-3 bg-foreground" />
          <span className="h-1 w-2 bg-foreground" />
          <span className="h-1 w-1 bg-foreground" />
        </span>
      </div>
      <MineStrip />
    </div>
  );
}

/**
 * Betűnként megjelenő szöveg. A felolvasó a teljes mondatot egyben kapja (sr-only);
 * a betűnkénti változat csak látvány, mert a különálló betűkből a szóközök kiesnének a címsor nevéből.
 */
function Typed({ text }: { text: string }) {
  const letters = Array.from(text);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {letters.map((letter, index) => (
          // A mondat egy rendereléshez rögzített; új mondatnál az egész újraindul.
          <span key={`${text}-${index}`} className="typed-letter" style={{ animationDelay: `${index * TYPE_MS}ms` }}>
            {letter}
          </span>
        ))}
      </span>
    </>
  );
}
