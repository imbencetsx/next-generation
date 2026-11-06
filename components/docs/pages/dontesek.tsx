import type { ReactNode } from "react";
import Example from "@/components/docs/example";
import type { DocExampleId } from "@/lib/docs/examples";

type Decision = {
  id: string;
  title: string;
  spec: ReactNode;
  decision: ReactNode;
  status: "decided" | "provisional";
  examples?: DocExampleId[];
};

const DECISIONS: Decision[] = [
  {
    id: "D1",
    title: "Hol áll az else?",
    spec: <>A kiírás szövege: „Az else az if törzsével azonos behúzáson van.” A kiírás példaprogramjában viszont az <code>else</code> az <code>if</code> sorával van egy szinten.</>,
    decision: <>Az <code>else</code> a hozzá tartozó <code>if</code> sorával áll egy szinten, közvetlenül a then-ág után. A törzs szintjén álló <code>else</code> szintaktikai hiba.</>,
    status: "decided",
    examples: ["else-good", "else-bad"],
  },
  {
    id: "D2",
    title: "Lehet-e üres egy blokk?",
    spec: <>Az EBNF szerint <code>block = {"{ command }"}</code>, vagyis nulla vagy több utasítás.</>,
    decision: <>Igen. Egy üres törzsű <code>while</code> a lépéskorlátig fut.</>,
    status: "decided",
    examples: ["empty-block", "empty-while"],
  },
  {
    id: "D3",
    title: "Mi történik, ha a step forward menet közben falba ütközik?",
    spec: <>„step forward a soron következő lépésnél falra vezetne vagy lelépne a térképről” → <code>E_BEDROCK_HIT</code>.</>,
    decision: <>A robot megteszi a szabad mezőket, majd a fal előtt megáll a hibával.</>,
    status: "provisional",
    examples: ["step-partial"],
  },
  {
    id: "D4",
    title: "Üres kamra-e az aranyat tartalmazó mező?",
    spec: <>„0 = üres kamra, 1 = fal, 2 = aranyrög”, a <code>.</code> jel pedig olyan kamra, „amiben épp nem található se a robot, se aranyrög”.</>,
    decision: <>Nem. Az <code>isThere 0</code> csak akkor igaz, ha a mező a térképen belül van, nem fal, és nincs rajta arany. A már kibányászott mező ismét üres.</>,
    status: "provisional",
    examples: ["isthere-zero-gold"],
  },
  {
    id: "D5",
    title: "Üres sor-e a fájl végi sortörés?",
    spec: <>„A forráskód nem tartalmaz utasítás nélküli — azaz üres — sorokat”, de „a program lehet üres is”.</>,
    decision: <>Egyetlen, fájl végi sortörést figyelmen kívül hagyunk. Minden más üres sor hiba.</>,
    status: "provisional",
    examples: ["empty-line", "empty-program"],
  },
  {
    id: "D6",
    title: "Mekkora lehet egy kiszámolt egész?",
    spec: <>Csak a kódba írt literálok vannak 0–100 közé korlátozva.</>,
    decision: <>A számolt értékek nincsenek korlátozva (JavaScript-szám, 2<sup>53</sup>-ig pontos). Érdemes megkérdezni a szervezőket.</>,
    status: "provisional",
    examples: ["computed-range"],
  },
  {
    id: "D7",
    title: "Mi számít felfedezett mezőnek?",
    spec: <>„amelyeken a robot már járt, vagy amelyekre meghívódott az isThere függvény”.</>,
    decision: <>A kezdőmező, minden mező, amelyre a robot belép, és az <code>isThere</code> által vizsgált, térképen belüli mező.</>,
    status: "provisional",
  },
];

export default function Dontesek() {
  return (
    <>
      <p>
        A kiírás néhány ponton hiányos vagy ellentmondásos. Ezeket itt gyűjtjük, hogy minden csapattag és minden
        AI-ügynök ugyanúgy értelmezze őket. Ugyanez a lista megtalálható az <code>AGENTS.md</code>-ben is.
        Új kérdésnél nem találgatunk: megbeszéljük, és ide írjuk.
      </p>
      {DECISIONS.map((item) => (
        <section key={item.id}>
          <h2 id={item.id}>
            <span className="mr-2 font-mono text-base text-[var(--d-muted)]">{item.id}</span>
            {item.title}{" "}
            <span className={`badge align-middle ${item.status === "decided" ? "badge-good" : "badge-warn"}`}>
              {item.status === "decided" ? "Eldöntve" : "Ideiglenes"}
            </span>
          </h2>
          <table>
            <tbody>
              <tr><th className="w-32">Kiírás</th><td>{item.spec}</td></tr>
              <tr><th>Döntés</th><td>{item.decision}</td></tr>
            </tbody>
          </table>
          {item.examples?.map((id) => <Example key={id} id={id} />)}
        </section>
      ))}
    </>
  );
}
