import Link from "next/link";
import Example from "@/components/docs/example";
import { CheckCircle2, XCircle } from "lucide-react";
import { DocBadge, Note, Status } from "@/components/docs/ui";

const PIPELINE = [
  ["Szerkesztő", "CodeMirror 6: kiemelés, sorszámok, élő hibajelzés"],
  ["Szintaktikai ellenőrzés", "Soronként, pontos hibahellyel — hibás program nem indul"],
  ["Feldolgozás", "Utasításfa (AST), minden csomópont ismeri a forrássorát"],
  ["Végrehajtás", "Egy lépés = egy feldolgozott programsor, max. 1000"],
  ["Megjelenítés", "Térkép, robot, felfedezett mezők, konzol, számlálók"],
] as const;

export default function Attekintes() {
  return (
    <>
      <h2>Mi ez?</h2>
      <p>
        Egy böngészőben futó játék, amelyben egy kincskereső robotot irányítasz egy bányában. A robotot a{" "}
        <strong>MineScript</strong> nevű, kicsi, soralapú programnyelven írt program vezérli: halad, fordul, megnézi, mi van
        előtte, és kibányássza az aranyrögöket. A cél: <strong>minél több arany, minél kevesebb lépésben</strong>. A
        ranglistán ez a két szám számít.
      </p>
      <p>
        A feladat a Dusza Árpád Országos Programozói Emlékverseny 2026/2027 I. fordulójának (web) kiírása alapján készül.
        Ez a dokumentáció a kiírás szabályait és a csapat döntéseit foglalja össze.
      </p>

      <h2>Hogyan használd ezt a dokumentációt?</h2>
      <p>Minden kódpélda kipróbálható, és ugyanazzal az interpreterrel fut, mint a játék.</p>
      <ul>
        <li><strong>Futtatás</strong> — lefuttatja a példát, és összeveti a <em>várt eredménnyel</em>. Az „Egyezik a várt eredménnyel” jelzés azt jelenti, hogy a motor pontosan úgy viselkedik, ahogy a dokumentáció állítja.</li>
        <li><strong>Szerkesztés</strong> — átírhatod a kódot, és megnézheted, mi változik.</li>
        <li><strong>Megnyitás a szerkesztőben</strong> — átviszi a kódot és a térképet a teljes szerkesztőbe, ahol lassítva, animálva is lefuttathatod.</li>
      </ul>
      <p>A <DocBadge><CheckCircle2 aria-hidden /> Helyes</DocBadge> példák hiba nélkül futnak, a <DocBadge variant="destructive"><XCircle aria-hidden /> Hibás</DocBadge> példák szándékosan szabályt sértenek.</p>

      <Example id="pdf-program" />

      <h2>Hogyan működik?</h2>
      {/* A feldolgozás lépései egymás után következnek, ezért számozottak. */}
      <ol className="!my-6 !max-w-none !list-none !pl-0 grid gap-2 sm:grid-cols-5">
        {PIPELINE.map(([title, text], index) => (
          <li key={title} className="pixel-frame !m-0 bg-card p-3">
            <div className="font-mono text-xs text-muted-foreground">{index + 1}</div>
            <div className="mt-1 font-pixel">{title}</div>
            <div className="mt-1 text-sm leading-snug text-muted-foreground">{text}</div>
          </li>
        ))}
      </ol>
      <p>
        A játékszabályok egy önálló TypeScript-modulban élnek, amely nem függ a felülettől. Így ugyanaz a kód fut a
        böngészőben, ebben a dokumentációban és később a szerveren is, ahol a ranglista eredményeit ellenőrizzük. A
        részletek: <Link href="/docs/interpreter">Az interpreter</Link>.
      </p>

      <h2>Hol tart a projekt?</h2>
      <table>
        <thead><tr><th>Funkció</th><th>Állapot</th><th>Megjegyzés</th></tr></thead>
        <tbody>
          <tr><td>Kódszerkesztő, import/export, mintaprogramok</td><td><Status kind="done" /></td><td>Élő szintaktikai ellenőrzés, hibalista, ugrás a hibás sorra</td></tr>
          <tr><td>Szintaktikai ellenőrzés</td><td><Status kind="done" /></td><td>A kiírás 2.1 fejezete szerint</td></tr>
          <tr><td>Interpreter</td><td><Status kind="done" /></td><td>A kiírás minden szabálya; pontos, kódolt hibaüzenetek javaslattal; több mint ezer megfelelőségi teszt</td></tr>
          <tr><td>Szimulátor (lejátszás, térkép, konzol)</td><td><Status kind="prototype" /></td><td>Futtatás, léptetés, szünet, sebesség, köd</td></tr>
          <tr><td>Térképimport, beépített pályák</td><td><Status kind="done" /></td><td>Hibás fájl nem írja felül a betöltött térképet</td></tr>
          <tr><td>Térképszerkesztő, térképexport</td><td><Status kind="planned" /></td><td><Link href="/docs/terkepek">Térképek</Link></td></tr>
          <tr><td>Bejelentkezés, mentés</td><td><Status kind="planned" /></td><td>Drizzle ORM + SQLite</td></tr>
          <tr><td>Ranglista</td><td><Status kind="planned" /></td><td>A szerver újrafuttatja a programot, a kliens számait nem fogadja el</td></tr>
        </tbody>
      </table>

      <h2>Technológia</h2>
      <ul>
        <li><strong>Next.js 16 + React 19 + TypeScript</strong> — egy alkalmazásban a felület és a (tervezett) szerveroldal.</li>
        <li><strong>CodeMirror 6</strong> — kódszerkesztő saját MineScript-kiemeléssel.</li>
        <li><strong>Tailwind CSS</strong> — stílusok.</li>
        <li><strong>Drizzle ORM + SQLite</strong> — tervezett adattárolás (felhasználók, térképek, futások).</li>
        <li><strong>Vitest, Playwright</strong> — tervezett tesztelés.</li>
      </ul>

      <Note tone="spec">
        <p>A kiírás szerint futtatni csak szintaktikailag helyes programot lehet, a futás lassítva történik, látszik az épp végrehajtott sor, a <code>print</code> kimenete konzolra kerül, és a futás leállítható.</p>
      </Note>
    </>
  );
}
