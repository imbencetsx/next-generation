import Link from "next/link";
import Example from "@/components/docs/example";
import { Pre } from "@/components/docs/code-view";
import { Note } from "@/components/docs/ui";

const EBNF = `programme     = { command }
command       = procedure | set | if | ifelse | while
procedure     = step | turn | mine | print
function      = isThere
step          = "step" "forward" simpleval
turn          = "turn" "by" simpleval
mine          = "mine" "here"
print         = "print" simpleval
isThere       = "isThere" simpleval
set           = "set" ident "to" calculatedval
if            = "if" simpleval block
ifelse        = "if" simpleval block "else" block
while         = "while" simpleval block
block         = { command }
calculatedval = simpleval | function | binop | unop
binop         = simpleval binoperator simpleval
unop          = unoperator simpleval
simpleval     = ident | number | boolean-lit
binoperator   = "+" | "-" | "*" | "=" | "<>" | "<" | "<=" | ">" | ">=" | "and" | "or"
unoperator    = "not"
boolean-lit   = "true" | "false"
ident         = letter { letter | digit }
number        = digit { digit }
letter        = "a".."z" | "A".."Z"
digit         = "0".."9"`;

export default function Nyelv() {
  return (
    <>
      <p>
        A MineScript szándékosan kicsi nyelv: <strong>soronként egy utasítás</strong>, nincsenek zárójelek, nincs
        egymásba ágyazott kifejezés, és minden érték egyetlen token. Ez a fejezet a kiírás 2. fejezetét dolgozza fel.
      </p>

      <h2 id="utasitasok">Utasítások</h2>
      <table>
        <thead>
          <tr>
            <th>Alak</th>
            <th>Jelentés</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>set név to érték</code>
            </td>
            <td>
              Értékadás. Az érték lehet egyszerű érték, <code>isThere x</code>, <code>not x</code> vagy{" "}
              <code>a művelet b</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>step forward n</code>
            </td>
            <td>
              A robot <code>n</code> mezőt halad előre.
            </td>
          </tr>
          <tr>
            <td>
              <code>turn by n</code>
            </td>
            <td>
              A robot <code>n</code> negyedfordulatot fordul <strong>balra</strong>.
            </td>
          </tr>
          <tr>
            <td>
              <code>mine here</code>
            </td>
            <td>Kibányássza az aranyat a robot mezőjéről.</td>
          </tr>
          <tr>
            <td>
              <code>print x</code>
            </td>
            <td>
              Kiírja <code>x</code> értékét a konzolra.
            </td>
          </tr>
          <tr>
            <td>
              <code>if x</code> … <code>else</code> …
            </td>
            <td>
              Feltételes elágazás; az <code>else</code> ág opcionális.
            </td>
          </tr>
          <tr>
            <td>
              <code>while x</code> …
            </td>
            <td>
              Ciklus: a törzs addig ismétlődik, amíg <code>x</code> igaz.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        A robotutasítások részletei: <Link href="/docs/robot">Robot API</Link>.
      </p>

      <h2 id="tokenek">Tokenek és kis-nagybetűk</h2>
      <ul>
        <li>
          <strong>Kulcsszavak:</strong>{" "}
          <code>
            and, by, else, false, forward, here, if, isThere, mine, not, or, print, set, step, to, true, turn, while
          </code>
          .
        </li>
        <li>
          A kulcsszavakat <strong>pontosan</strong> így kell írni: <code>isThere</code>, nem <code>isthere</code>.
        </li>
        <li>
          <strong>Azonosító</strong> (változónév): betűvel kezdődik, utána betűk és számjegyek. Kis-nagybetűérzékeny:{" "}
          <code>arany</code> és <code>Arany</code> két külön változó.
        </li>
        <li>
          Kulcsszó <strong>semmilyen</strong> kis-nagybetűs alakban nem lehet változónév: <code>While</code> és{" "}
          <code>ISTHERE</code> is tilos.
        </li>
        <li>
          <strong>Számliterál:</strong> a kódba írt egész számok 0 és 100 közöttiek. Számolt érték lehet ezen kívül is.
        </li>
        <li>
          <strong>Logikai literál:</strong> <code>true</code>, <code>false</code>.
        </li>
      </ul>
      <Example id="case-sensitive" />
      <Example id="keyword-case" />
      <Example id="isthere-case" />
      <Example id="reserved-ident" />
      <Example id="literal-max" />
      <Example id="literal-over" />
      <Example id="computed-range" />

      <h2 id="tipusok">Típusok és változók</h2>
      <ul>
        <li>
          Két típus van: <strong>egész</strong> és <strong>logikai</strong>. Közöttük nincs automatikus átalakítás.
        </li>
        <li>
          Nincs deklaráció: a változó az első <code>set</code>-tel jön létre, és a program végéig él.
        </li>
        <li>
          Az első értékadás <strong>véglegesen rögzíti</strong> a változó típusát.
        </li>
        <li>
          Minden típusellenőrzés <strong>futás közben</strong> történik. Ha egy hibás sor nem fut le, nincs hiba.
        </li>
      </ul>
      <Example id="type-lock" />
      <Example id="uninit" />
      <Example id="dead-branch" />

      <h2 id="kifejezesek">
        Kifejezések (a <code>set</code> jobb oldala)
      </h2>
      <p>
        A <code>to</code> után pontosan egy ilyen alak állhat:
      </p>
      <table>
        <thead>
          <tr>
            <th>Alak</th>
            <th>Példa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>egyszerű érték (változó, szám, logikai)</td>
            <td>
              <code>set x to 5</code>
            </td>
          </tr>
          <tr>
            <td>
              függvény: <code>isThere érték</code>
            </td>
            <td>
              <code>set fal to isThere 1</code>
            </td>
          </tr>
          <tr>
            <td>
              unáris: <code>not érték</code>
            </td>
            <td>
              <code>set megy to not fal</code>
            </td>
          </tr>
          <tr>
            <td>
              bináris: <code>érték művelet érték</code>
            </td>
            <td>
              <code>set count to count + 1</code>
            </td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Művelet</th>
            <th>Operandusok</th>
            <th>Eredmény</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>+ - *</code>
            </td>
            <td>egész, egész</td>
            <td>egész</td>
          </tr>
          <tr>
            <td>
              <code>{"< <= > >="}</code>
            </td>
            <td>egész, egész</td>
            <td>logikai</td>
          </tr>
          <tr>
            <td>
              <code>{"= <>"}</code>
            </td>
            <td>
              két egész <em>vagy</em> két logikai
            </td>
            <td>logikai</td>
          </tr>
          <tr>
            <td>
              <code>and or</code>
            </td>
            <td>logikai, logikai</td>
            <td>logikai</td>
          </tr>
          <tr>
            <td>
              <code>not</code>
            </td>
            <td>logikai</td>
            <td>logikai</td>
          </tr>
        </tbody>
      </table>
      <Example id="chained" />
      <Example id="parenthesis" />

      <h3 id="kiertekeles">Kiértékelési sorrend</h3>
      <p>Ez a sorrend a hibakódokon keresztül látszik, ezért pontosan így működik:</p>
      <ol>
        <li>
          Balról jobbra halad. Beolvassa az első operandust, és <strong>azonnal</strong> ellenőrzi, hogy a típusa
          megfelel-e a műveletnek.
        </li>
        <li>
          Utána beolvassa és ellenőrzi a másodikat. <strong>Nincs rövidzár:</strong> <code>true or c</code> esetén is
          beolvassa <code>c</code>-t.
        </li>
        <li>
          Az <code>=</code> és a <code>{"<>"}</code> első operandusa bármilyen típusú lehet; a két típus egyezését a
          második beolvasása <em>után</em> ellenőrzi.
        </li>
        <li>Siker esetén beírja az eredményt a változóba (ha már létezik, a típusnak egyeznie kell).</li>
      </ol>
      <Example id="no-short-circuit" />
      <Example id="operand-order" />
      <Example id="eq-types" />
      <Example id="eq-reads-second" />
      <Example id="eq-bool" />
      <Example id="not-int" />

      <h2 id="vezerles">Feltételek és ciklusok</h2>
      <p>
        Az <code>if</code> és a <code>while</code> után egyetlen <strong>egyszerű érték</strong> állhat, és annak
        logikainak kell lennie. Összetett feltételt előbb változóba kell számolni.
      </p>
      <Example id="while-expr" />
      <Example id="while-fixed" />
      <Example id="non-bool" />
      <Example id="else-good" />

      <h2 id="behuzas">Behúzás és blokkok</h2>
      <ul>
        <li>
          A sor eleji szóközök adják a blokkszintet. Ami az <code>if</code>/<code>while</code> sora után beljebb
          kezdődik, az a törzs; amint a behúzás csökken, a törzs véget ér.
        </li>
        <li>
          Csak <code>if</code>, <code>else</code> és <code>while</code> után kezdődhet beljebb húzott blokk.
        </li>
        <li>
          Egy blokkon belül a behúzás egységes, de <strong>blokkonként eltérhet</strong> a mértéke.
        </li>
        <li>Visszahúzni csak egy már létező szintre lehet.</li>
        <li>
          Az <code>else</code> a hozzá tartozó <code>if</code> sorával egy szinten áll, közvetlenül a then-ág után.
        </li>
        <li>Üres blokk megengedett.</li>
      </ul>
      <Note tone="decision" title="Projektdöntés · else behúzása">
        <p>
          A kiírás szövege szerint az <code>else</code> „az if törzsével azonos behúzáson van”, a kiírás
          példaprogramjában viszont az <code>if</code> sorával van egy szinten. A példát követjük. Részletek:{" "}
          <Link href="/docs/dontesek">Döntések</Link>.
        </p>
      </Note>
      <Example id="indent-no-opener" />
      <Example id="indent-mismatch" />
      <Example id="block-indents" />
      <Example id="else-bad" />
      <Example id="empty-block" />

      <h2 id="szokozok">Szóközök és sorok</h2>
      <ul>
        <li>
          A tokenek között <strong>pontosan egy</strong> szóköz áll. Dupla szóköz és sor végi szóköz hiba.
        </li>
        <li>
          Behúzásra csak szóköz használható, <strong>tabulátor nem</strong>.
        </li>
        <li>
          A programban <strong>nem lehet üres sor</strong>. (A fájl végi egyetlen sortörés nem számít üres sornak.)
        </li>
        <li>Az üres program szabályos.</li>
      </ul>
      <Example id="double-space" />
      <Example id="tab-indent" />
      <Example id="empty-line" />
      <Example id="empty-program" />

      <h2 id="ebnf">A teljes nyelvtan (EBNF)</h2>
      <p>A kiírásban megadott formális nyelvtan, változtatás nélkül:</p>
      <Pre label="EBNF">{EBNF}</Pre>
      <Note tone="warn">
        <p>
          Az EBNF önmagában nem elég: a sorokra bontás, a behúzás és a szóközszabályok (lásd fent) a kiírás 2.1
          fejezetéből jönnek. A feldolgozást ezért nem szabad <code>trim()</code>-mel és tetszőleges szóközök mentén
          darabolással kezdeni, mert az eltüntetné a jelzendő hibákat.
        </p>
      </Note>
    </>
  );
}
