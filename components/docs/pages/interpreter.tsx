import Link from "next/link";
import Example from "@/components/docs/example";
import { Pre } from "@/components/docs/code-view";
import { Note } from "@/components/docs/ui";

// A kiírás fő példaprogramjának egy részlete és a belőle fordított lapos utasításlista.
const FLAT = ` 4  while megy                  #0 while megy      igaz → #1   hamis → vége
 5    set arany to isThere 2    #1 set             → #2
 6    if arany                  #2 if arany        igaz → #3   hamis → #6
 7      step forward 1          #3 step            → #4
 8      mine here               #4 mine            → #5
 9      set count to count + 1  #5 set             → #8
10    else                      #6 else (számít)   → #7
11      step forward 1          #7 step            → #8
12    set fal to isThere 1      #8 set             → #9
13    set megy to not fal       #9 set             → #0  (vissza a while sorára)`;

export default function Interpreter() {
  return (
    <>
      <Note tone="spec" title="Állapot">
        <p>
          Az interpreter a kiírás minden szabályát megvalósítja, és több mint ezer megfelelőségi teszt ellenőrzi. Minden hibát
          kóddal, pontos sor- és oszlopszámmal, magyarázattal és javítási javaslattal jelez (lásd: <Link href="/docs/hibak">Hibák</Link>).
        </p>
      </Note>

      <h2 id="lanc">A feldolgozási lánc</h2>
      <ol>
        <li>
          <strong>Elemzés</strong> (<code>lib/syntax.ts</code>, <code>analyzeSource</code>). Egyetlen menetben bontja sorokra és
          tokenekre a kódot, ellenőrzi a behúzást, a szóközöket, az utasítások alakját, a literálokat és a változóneveket, és
          felépíti a blokkszerkezetet. Egy hiba után is folytatja, így egyszerre minden hibát megmutat, láncolt téves hibák
          nélkül. A szerkesztő élőben ezt mutatja (<code>validateMineScript</code>).
        </li>
        <li>
          <strong>Fordítás</strong> (<code>parseProgram</code>). Ha nincs szintaktikai hiba, ugyanebből a menetből lapos
          utasításlista készül. Minden utasítás megjegyzi a forrássorát és az oszlopait, az <code>else</code> is, mert a
          kiemeléshez, a hibákhoz és a lépésszámláláshoz kell. Mivel az ellenőrzés és a fordítás ugyanaz a kód, a kettő nem
          térhet el egymástól.
        </li>
        <li>
          <strong>Végrehajtás</strong> (<code>Machine</code>). Egy <code>step()</code> hívás <strong>pontosan egy
          programsort</strong> dolgoz fel. A gép egy programszámlálóval halad a listán: minden utasítás tudja, melyik a
          következő, az <code>if</code> és a <code>while</code> pedig azt is, hova kell ugrani igaz, illetve hamis feltételnél.
          Egy lépés állandó idejű, bármikor megállítható és folytatható. A <code>step()</code> egy eseményt is visszaad
          (érintett mezők, kiírt szöveg), ebből a felület mezőnként animálhat.
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
      <Pre label="A fő példaprogram ciklusa lapos utasításlistaként">{FLAT}</Pre>

      <h3 id="vegrehajtas">Hogyan halad a gép?</h3>
      <ul>
        <li><code>if</code>: kiértékeli a feltételt; igaz esetén a then-ág első sorára ugrik, hamis esetén az <code>else</code> sorára (ha van), különben az if utáni sorra.</li>
        <li><code>else</code>: önálló, számolt utasítás, de csak akkor kerül sorra, ha az if feltétele hamis volt.</li>
        <li><code>while</code>: igaz feltételnél a törzs első sorára ugrik, a törzs utolsó sora pedig visszamutat a <code>while</code> sorára, így minden újabb feltételvizsgálat is egy feldolgozott sor. Üres törzsnél a <code>while</code> önmagára mutat.</li>
        <li>Ha nincs következő utasítás, a futás sikeresen véget ér.</li>
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
