import MapExample from "@/components/docs/map-example";
import { Pre } from "@/components/docs/code-view";
import { MiniMap } from "@/components/docs/mini-map";
import { Note } from "@/components/docs/ui";
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
      <p>A szimulátor „Load map…” listájában érhetők el.</p>
      <div className="flex flex-wrap gap-6">
        {MAP_PRESETS.map((preset, index) => (
          <MiniMap key={preset.name} map={presetMap(index)} caption={preset.name} />
        ))}
      </div>

      <h2 id="szerkeszto">Térképszerkesztő</h2>
      <Note tone="future">
        <p>A térképszerkesztő még nem készült el. A terv:</p>
      </Note>
      <ul>
        <li>
          <strong>Eszköztár:</strong> üres kamra, fal, arany és a robot négy iránya. A kiválasztott eszközzel kattintva
          vagy húzva lehet festeni.
        </li>
        <li>
          <strong>Robot:</strong> új helyre rakáskor a régi helyéről automatikusan eltűnik, így mindig pontosan egy
          robot van. Ha aranyra kerülne, az arany törlődik.
        </li>
        <li>
          <strong>Méretezés</strong> 1–15 között; átméretezéskor a meglévő tartalom megmarad.
        </li>
        <li>
          <strong>Ellenőrzés:</strong> hibalista jelzi, mi hiányzik; mentés és export csak érvényes térképpel.
        </li>
        <li>
          <strong>Akadálymentesség:</strong> billentyűzettel bejárható rács, a mezők típusa ikonnal is jelölve.
        </li>
        <li>
          <strong>Export</strong> a fenti szöveges formátumban; az import ugyanazzal az ellenőrzéssel.
        </li>
      </ul>

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
