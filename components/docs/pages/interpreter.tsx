import Link from "next/link";
import Example from "@/components/docs/example";
import { Pre } from "@/components/docs/code-view";
import { Note } from "@/components/docs/ui";

const TREE = `while megy                 { kind: "while", line: 4, cond: megy, body: [
  set arany to isThere 2       { kind: "set", line: 5, name: "arany", expr: isThere 2 },
  if arany                     { kind: "if", line: 6, cond: arany,
    step forward 1               then: [ step 1 (line 7), mine (line 8), set … (line 9) ],
    mine here                    elseLine: 10,
    set count to count + 1       else: [ step 1 (line 11) ] },
  else                         …
    step forward 1           ] }`;

export default function Interpreter() {
  return (
    <>
      <Note tone="warn" title="Állapot">
        <p>Az interpreter működő prototípus. A továbbfejlesztése jelenleg szünetel. Ez az oldal a mostani működést és a terveket írja le.</p>
      </Note>

      <h2 id="lanc">A feldolgozási lánc</h2>
      <ol>
        <li>
          <strong>Szintaktikai ellenőrzés</strong> (<code>lib/minescript.ts</code>, <code>validateMineScript</code>). Soronként
          ellenőrzi a behúzást, a szóközöket, az utasítások alakját, a literálokat és a változóneveket. Minden hibához sor- és
          oszlopszámot ad. A szerkesztő élőben ezt mutatja.
        </li>
        <li>
          <strong>Feldolgozás</strong> (<code>lib/interpreter.ts</code>, <code>parseProgram</code>). A helyes programból
          utasításfát (AST) épít. Minden csomópont megjegyzi az eredeti sorszámát, az <code>else</code> is, mert a
          kiemeléshez, a hibákhoz és a lépésszámláláshoz kell.
        </li>
        <li>
          <strong>Végrehajtás</strong> (<code>Machine</code>). Egy <code>step()</code> hívás <strong>pontosan egy
          programsort</strong> dolgoz fel. A gép blokkveremmel (<em>frame stack</em>) jegyzi, hol tart, így bármikor
          megállítható és folytatható. Rekurzió nincs, a mély egymásba ágyazás sem gond.
        </li>
        <li>
          <strong>Pillanatkép</strong> (<code>snapshot()</code>). Minden lépés után a felület egy másolatot kap az
          állapotról: robot, felfedezett mezők, arany, változók, konzol, számlálók, hiba. A felület semmilyen
          játékszabályt nem tartalmaz, csak megjeleníti ezt.
        </li>
        <li>
          <strong>Lejátszás</strong> (<code>components/use-simulation.ts</code>). Egy időzítő a választott sebességgel hívja
          a <code>step()</code>-et. A szerkesztő kiemeli az aktuális sort (hibánál pirossal), és futás közben zárolja a
          szerkesztést.
        </li>
      </ol>
      <Pre label="Hogyan lesz a kódból utasításfa (vázlat)">{TREE}</Pre>

      <h3 id="vegrehajtas">Hogyan halad a gép?</h3>
      <ul>
        <li><code>if</code>: kiértékeli a feltételt, és ha igaz, a then-ág blokkját teszi a verem tetejére. Ha hamis, és van else, az <code>else</code> sort és az else-ágat.</li>
        <li><code>while</code>: ha a feltétel igaz, a törzset teszi a verembe, de a <code>while</code> sorától nem lép tovább. Amikor a törzs elfogy, a gép visszatér a <code>while</code> sorához, és újra kiértékeli.</li>
        <li>Ha a legkülső blokk is elfogyott, a futás sikeresen véget ér.</li>
        <li>Az értékadás és a műveletek pontos sorrendje: <Link href="/docs/nyelv#kiertekeles">Kiértékelési sorrend</Link>.</li>
      </ul>

      <h2 id="szamlalas">Lépésszámlálás</h2>
      <p>
        A ranglista „lépésszáma” a <strong>feldolgozott programsorok száma</strong>, nem a megtett mezőké. A{" "}
        <code>step forward 5</code> egy lépés.
      </p>
      <ul>
        <li>Minden végrehajtott sor egynek számít.</li>
        <li>Az <code>if</code> sora egyszer számít, amikor a feltételét kiértékeli.</li>
        <li>A <code>while</code> sora <strong>minden</strong> feltétel-kiértékelésnél számít, az utolsó, hamis vizsgálatnál is.</li>
        <li>Az <code>else</code> sora csak akkor számít, ha az else-ág lefut.</li>
        <li>A törzs sorai minden ismétléskor újra számítanak.</li>
      </ul>
      <Example id="count-else-false" />
      <Example id="count-else-true" />
      <Example id="while-fixed" />
      <p>
        Az utóbbi 13 lépése: 2 kezdő <code>set</code> + 4 <code>while</code>-vizsgálat (3 igaz, 1 hamis) + 3 × 2
        törzssor + 1 <code>print</code>.
      </p>

      <h2 id="limit">Az 1000 soros korlát</h2>
      <p>
        Legfeljebb 1000 programsor dolgozható fel. Ha a program pontosan az 1000. sor után ér véget, a futás{" "}
        <strong>sikeres</strong>. Ha egy 1001. sort akarna feldolgozni, megszakad{" "}
        <code>INSTRUCTION_COUNT_LIMIT_EXCEEDED</code> hibával, és a hibás sor az, amelyiket már nem futtatta le.
      </p>
      <Example id="limit-exact" />
      <Example id="limit-over" />
      <Example id="infinite" />
      <Example id="empty-while" />

      <h2 id="allapotok">A futás állapotai</h2>
      <table>
        <thead><tr><th>Állapot</th><th>Jelentés</th></tr></thead>
        <tbody>
          <tr><td>Ready</td><td>Még nem indult el; a térkép kezdőállapotban van.</td></tr>
          <tr><td>Running / Paused</td><td>Fut, vagy léptetés, illetve szünet miatt áll. A szerkesztő zárolva.</td></tr>
          <tr><td>Finished</td><td>A program hiba nélkül véget ért.</td></tr>
          <tr><td>Error</td><td>Futásidejű hiba vagy a korlát túllépése. Látszik a hibakód és a sor.</td></tr>
        </tbody>
      </table>
      <p>Minden új futás a térkép friss másolatából indul, tehát a térkép és a robot alaphelyzetbe kerül.</p>

      <h2 id="tervek">Tervek</h2>
      <Note tone="future">
        <ul>
          <li><strong>Tesztek (Vitest):</strong> minden szabályra és hibakódra, a dokumentáció példáival együtt.</li>
          <li><strong>Szerveres újrafuttatás:</strong> a ranglista nem fogadja el a böngésző által küldött számokat. A szerver ugyanazzal a motorral, a tárolt térképverzión újrafuttatja a programot.</li>
          <li><strong>Interpreter verzió</strong> mentése minden eredmény mellé, hogy egy későbbi javítás után is látsszon, melyik motor számolta.</li>
          <li><strong>Web Worker:</strong> a végrehajtás külön szálon, hogy a felület semmiképp ne akadjon meg.</li>
          <li><strong>Finomabb animáció:</strong> a <code>step forward n</code> mezőnként animálva, miközben a sorszámláló egyszer nő.</li>
        </ul>
      </Note>
    </>
  );
}
