import MapExample from "@/components/docs/map-example";
import { Pre } from "@/components/docs/code-view";
import { MiniMap } from "@/components/docs/mini-map";
import { Note } from "@/components/docs/ui";
import { MESSAGES } from "@/i18n/messages";
import { MAP_PRESETS, presetMap } from "@/lib/robot-map";

const SPEC_MAP = "3 15\n....@..........\n.#############.\n.......@...>...";

export default function Terkepek() {
  return (
    <>
      <h2 id="formatum">A térképfájl formátuma</h2>
      <p>
        A térkép szöveges fájl. Az első sor a méret: <strong>sorok száma</strong>, egy szóköz,{" "}
        <strong>oszlopok száma</strong>. Utána soronként a mezők jönnek.
      </p>
      <Pre label="A kiírás példatérképe (3 sor, 15 oszlop)">{SPEC_MAP}</Pre>
      <table>
        <thead>
          <tr>
            <th>Jel</th>
            <th>Jelentés</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>.</code>
            </td>
            <td>üres kamra (se robot, se arany)</td>
          </tr>
          <tr>
            <td>
              <code>@</code>
            </td>
            <td>kamra aranyröggel</td>
          </tr>
          <tr>
            <td>
              <code>#</code>
            </td>
            <td>fal — áthatolhatatlan kőzet</td>
          </tr>
          <tr>
            <td>
              <code>{"> < ^ v"}</code>
            </td>
            <td>a robot, kelet / nyugat / észak / dél felé nézve</td>
          </tr>
        </tbody>
      </table>

      <h2 id="szabalyok">Szabályok</h2>
      <ul>
        <li>Mindkét méret legalább 1, legfeljebb 15.</li>
        <li>Pontosan annyi sor, amennyit a fejléc mond, és minden sor pontosan olyan hosszú, amennyi oszlop van.</li>
        <li>Csak a fenti jelek szerepelhetnek.</li>
        <li>
          <strong>Pontosan egy robot</strong> van, és aranyrögöt nem tartalmazó kamrában áll. Ezt a jelkészlet eleve
          biztosítja, a szerkesztőnek viszont figyelnie kell rá.
        </li>
        <li>
          Hibás fájl importálásakor érthető hibaüzenet jelenik meg, és a hibás tartalom <strong>nem töltődik be</strong>
          . A korábbi térkép megmarad.
        </li>
      </ul>

      <h3>Próbáld ki</h3>
      <p>
        A térképfájlok szerkeszthetők; az <em>Ellenőrzés</em> ugyanazt a beolvasót futtatja, mint a szimulátor importja.
      </p>
      <MapExample title="A kiírás példatérképe" text={SPEC_MAP} valid />
      <MapExample title="Legkisebb térkép: egyetlen mező a robottal" text={"1 1\n>"} valid />
      <MapExample title="Rossz sorhossz" text={"2 4\n>..@\n..."} valid={false} />
      <MapExample title="Két robot" text={"2 3\n>.<\n.@."} valid={false} />
      <MapExample title="Nincs robot" text={"2 3\n...\n.@."} valid={false} />
      <MapExample title="Túl nagy méret" text={"16 1\n>\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n."} valid={false} />
      <MapExample title="Ismeretlen jel" text={"1 3\n>x@"} valid={false} />

      <h2 id="beepitett">Beépített pályák</h2>
      <p>
        A kezdőlap a legkönnyebbeket mutatja, a <em>Beépített pályák</em> oldal (<code>/maps/built-in</code>) mindet,
        nehézség szerint. Egy pálya kártyájáról programot lehet írni rá, vagy a másolatát a térképszerkesztőben
        átalakítani.
      </p>
      <div className="flex flex-wrap gap-6">
        {MAP_PRESETS.map((preset, index) => (
          <MiniMap
            key={preset.name}
            map={presetMap(index)}
            caption={`${MESSAGES.hu.sim.maps[preset.name]} (${MESSAGES.hu.home.difficulty[preset.difficulty].toLowerCase()})`}
          />
        ))}
      </div>

      <h2 id="szerkeszto">Térképszerkesztő</h2>
      <p>
        A munkafelület fejlécéből (<strong>Térképszerkesztő</strong>) érhető el, a szimulátorban éppen betöltött
        térképpel. Felépítése a munkafelületé: bal oldalon a térképfájl szövege, jobb oldalon ugyanaz a térkép rajzolva.
        A két nézet ugyanazt a szöveget szerkeszti, így bármelyikben dolgozol, a másik azonnal követi.
      </p>
      <ul>
        <li>
          <strong>Szöveges szerkesztés</strong> a kódszerkesztővel, a térképjelek színezésével és élő hibajelzéssel. A
          szöveg szerkesztés közben lehet hibás; ilyenkor a rajz az utolsó érvényes térképet mutatja, és a hibára
          kattintva a hibás helyre ugrik a kurzor.
        </li>
        <li>
          <strong>Ecsetek:</strong> üres kamra, arany, fal és robot. Kattintva vagy lenyomott egérgombbal áthúzva lehet
          festeni. A robot új helyre rakva a régiről eltűnik, így mindig pontosan egy robot van; a célmező aranya
          törlődik. A robot mezőjére falat vagy aranyat nem lehet tenni: előbb a robotot kell áthelyezni.
        </li>
        <li>
          <strong>Méret</strong> 1–15 sor és oszlop. Átméretezéskor a megmaradó mezők nem változnak; ha a robot kilógna,
          a legközelebbi megmaradó mezőre kerül. A robot kezdőiránya külön választható.
        </li>
        <li>
          <strong>Fájlműveletek:</strong> új térkép, mintapálya betöltése, import és export. A hibás import nem írja
          felül a szerkesztett térképet; exportálni és a szimulátorba átvinni csak érvényes térképet lehet.
        </li>
        <li>
          <strong>Akadálymentesség:</strong> a rács billentyűzettel bejárható (nyilak, Home/End, Ctrl+Home/End), a mezők
          neve a felolvasóknak is elmondja a sort, az oszlopot és a tartalmat.
        </li>
      </ul>
      <p>
        A <strong>Használat a szimulátorban</strong> gomb a térképet visszaviszi a munkafelületre; a szerkesztőben lévő
        program és a fájlneve közben megmarad.
      </p>

      <h2 id="tarolas">Tárolás és verziók</h2>
      <Note tone="future">
        <p>
          A térképek adatbázisba kerülnek (Drizzle ORM + SQLite). Minden mentés <strong>új verziót</strong> hoz létre,
          és a futási eredmények a térkép konkrét verziójához tartoznak. Így ha valaki később könnyebbre szerkeszt egy
          pályát, az új eredmények nem keverednek a régi ranglistával.
        </p>
      </Note>
    </>
  );
}
