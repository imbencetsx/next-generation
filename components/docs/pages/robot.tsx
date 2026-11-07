import Link from "next/link";
import Example from "@/components/docs/example";
import { Note } from "@/components/docs/ui";

export default function Robot() {
  return (
    <>
      <p>
        A robot a bányában egy mezőn áll, és a négy égtáj egyike felé néz. Csak azt érzékeli, ami{" "}
        <strong>közvetlenül előtte</strong> van. A példák a <em>Folyosó</em> térképen futnak: a robot a bal szélen áll,
        kelet felé néz, a 3., 6. és 8. oszlopban arany van, a 10. oszlop fal.
      </p>

      <h2 id="iranyok">Irányok és fordulás</h2>
      <table>
        <thead>
          <tr>
            <th>Jel</th>
            <th>Irány</th>
            <th>
              <code>turn by 1</code> után
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>{">"}</code>
            </td>
            <td>kelet</td>
            <td>észak</td>
          </tr>
          <tr>
            <td>
              <code>^</code>
            </td>
            <td>észak</td>
            <td>nyugat</td>
          </tr>
          <tr>
            <td>
              <code>{"<"}</code>
            </td>
            <td>nyugat</td>
            <td>dél</td>
          </tr>
          <tr>
            <td>
              <code>v</code>
            </td>
            <td>dél</td>
            <td>kelet</td>
          </tr>
        </tbody>
      </table>

      <h2 id="turn">turn by n</h2>
      <p>
        A robot <code>n</code> negyedfordulatot fordul <strong>balra</strong> (az óramutató járásával ellentétesen).
        <code> n</code> nemnegatív egész; <code>0</code> esetén nem fordul, és 4 fordulat után újra az eredeti irányba
        néz.
      </p>
      <Example id="turn-left" />
      <Example id="turn-four" />

      <h2 id="step">step forward n</h2>
      <p>
        A robot egyetlen utasítással <code>n</code> mezőt halad előre, és közben a köztes mezőket is érinti (ezek
        felfedezetté válnak). Az útba eső aranyrögök <strong>a helyükön maradnak</strong>. Ha a következő mező fal vagy
        a térképen kívül esik: <code>E_BEDROCK_HIT</code>.
      </p>
      <Example id="step-over-gold" />
      <Example id="step-zero" />
      <Example id="step-partial" />
      <Example id="off-map" />
      <Note tone="decision">
        <p>
          Ha a robot öt mezőt indul, de a harmadik fal, akkor az első kettőt megteszi, és utána áll meg hibával. Ezt a
          kiírás nem részletezi.
        </p>
      </Note>

      <h2 id="mine">mine here</h2>
      <p>
        Kibányássza az aranyrögöt arról a mezőről, amelyen a robot áll. Utána a mezőn nincs több arany. Arany nélküli
        mezőn <code>E_NO_GOLD</code>.
      </p>
      <Example id="mine-ok" />
      <Example id="mine-none" />
      <Example id="mine-twice" />

      <h2 id="isthere">isThere w</h2>
      <p>A robot előtti mezőt vizsgálja, és logikai értéket ad vissza.</p>
      <table>
        <thead>
          <tr>
            <th>
              <code>w</code>
            </th>
            <th>Igaz, ha az előtte lévő mező…</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>0</code>
            </td>
            <td>üres kamra (nem fal, és nincs rajta arany)</td>
          </tr>
          <tr>
            <td>
              <code>1</code>
            </td>
            <td>
              fal — <strong>a térkép széle is falnak számít</strong>
            </td>
          </tr>
          <tr>
            <td>
              <code>2</code>
            </td>
            <td>aranyrög</td>
          </tr>
        </tbody>
      </table>
      <p>
        Az <code>isThere</code> a megvizsgált mezőt felfedezetté teszi. Más érték (pl. <code>3</code>) vagy logikai
        paraméter: <code>E_BAD_ARG</code>.
      </p>
      <Example id="edge-wall" />
      <Example id="isthere-zero-gold" />

      <h2 id="print">print x</h2>
      <p>
        Kiírja az egész vagy logikai értéket a konzolra (<code>true</code>/<code>false</code>, illetve a szám).
      </p>
      <Example id="pdf-hello" />

      <h2 id="parameterek">Paraméterek</h2>
      <p>
        Az <code>n</code>, <code>w</code> és <code>x</code> paraméter mind egyszerű érték: szám, logikai literál vagy
        változó. Rossz típus vagy megengedett tartományon kívüli érték esetén <code>E_BAD_ARG</code> a hiba.
      </p>
      <Example id="bad-arg-turn" />
      <Example id="bad-arg-isthere" />
      <Example id="bad-arg-step" />

      <h2 id="felfedezes">Felfedezett mezők</h2>
      <p>
        A kiírás szerint futás közben a térkép megkülönbözteti a már felfedezett mezőket — amelyeken a robot járt, vagy
        amelyekre <code>isThere</code> hívódott — a feltérképezetlenektől. Felfedezett a kezdőmező, minden mező, amelyre
        a robot belép, és minden térképen belüli mező, amelyet <code>isThere</code> megvizsgál. A szimulátorban a{" "}
        <em>Fog</em> kapcsoló elrejti a fel nem fedezett mezőket. Lásd még: <Link href="/docs/terkepek">Térképek</Link>.
      </p>
    </>
  );
}
