import Link from "next/link";
import Example from "@/components/docs/example";
import type { DocExampleId } from "@/lib/docs/examples";

const SYNTAX: [string, string, string][] = [
  ["S_EMPTY_LINE", "Üres (vagy csak szóközből álló) sor a programban.", "(üres sor)"],
  ["S_TAB", "Tabulátor a sorban.", "⇥print 1"],
  ["S_SPACING", "Több szóköz két token között.", "set x  to 1"],
  ["S_TRAILING_SPACE", "Szóköz a sor végén.", "print 1␣"],
  ["S_INVALID_CHARACTER", "Nem megengedett karakter: zárójel, pontosvessző, ékezetes betű, megjegyzés, láthatatlan szóköz…", "print (1)"],
  ["S_UNKNOWN_INSTRUCTION", "Ismeretlen utasítás; rossz kis-nagybetű, elírás vagy más nyelvből hozott szó.", "Set x to 1"],
  ["S_EXPECTED_KEYWORD", "Hiányzó vagy rossz kötött szó: forward, by, here, to.", "step 1"],
  ["S_MISSING_VALUE", "Hiányzik egy érték.", "print"],
  ["S_EXTRA_TOKENS", "Fölösleges tokenek egy teljes utasítás után.", "print 1 2"],
  ["S_COMPLEX_VALUE", "Kifejezés ott, ahol csak egyetlen érték állhat.", "while i < 3"],
  ["S_NUMBER_RANGE", "100-nál nagyobb számliterál.", "set x to 101"],
  ["S_INVALID_VALUE", "Nem érvényes érték: TRUE, -1, 0x10, a+b…", "set x to TRUE"],
  ["S_RESERVED_NAME", "Kulcsszó változónévként.", "set While to 1"],
  ["S_INVALID_NAME", "Szabálytalan változónév.", "set 1a to 2"],
  ["S_INVALID_EXPRESSION", "Szabálytalan jobb oldal: több művelet, not not, isThere művelettel.", "set x to 1 + 2 + 3"],
  ["S_UNKNOWN_OPERATOR", "Nem létező operátor.", "set x to a == b"],
  ["S_UNEXPECTED_INDENT", "Behúzás olyan sor után, amely nem nyit blokkot.", "set a to 1 / ··print a"],
  ["S_INDENT_MISMATCH", "Visszahúzás nem létező szintre.", "if a / ····print 1 / ··print 2"],
  ["S_ELSE_WITHOUT_IF", "else, amely előtt nincs közvetlenül if.", "while a / else"],
  ["S_ELSE_MISALIGNED", "Az else az if törzsének szintjén áll (D1).", "if a / ··print 1 / ··else"],
  ["S_DUPLICATE_ELSE", "Második else ugyanahhoz az if-hez.", "if a / else / else"],
];

const RUNTIME: { code: string; when: string; example: DocExampleId }[] = [
  { code: "E_TYPE_MISMATCH", when: "Egy már rögzített típusú változónak más típusú értéket adsz.", example: "type-lock" },
  { code: "E_UNINITIALIZED", when: "Olyan változót olvasol, amelynek még nem adtál értéket.", example: "uninit" },
  { code: "E_NON_BOOL_CONDITION", when: "Az if vagy a while feltétele nem logikai érték.", example: "non-bool" },
  { code: "E_BAD_OPERAND", when: "Aritmetika vagy összehasonlítás nem egésszel, logikai művelet nem logikai értékkel, vagy = / <> két különböző típussal.", example: "operand-order" },
  { code: "E_BEDROCK_HIT", when: "A step forward a következő lépésnél falra vezetne, vagy lelépne a térképről.", example: "step-partial" },
  { code: "E_NO_GOLD", when: "mine here olyan mezőn, ahol nincs (vagy már nincs) arany.", example: "mine-none" },
  { code: "E_BAD_ARG", when: "API-hívás rossz típusú vagy tartományon kívüli paraméterrel, pl. isThere 3 vagy turn by true.", example: "bad-arg-isthere" },
  { code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED", when: "A program az 1000. feldolgozott sor után újabb sort dolgozna fel.", example: "infinite" },
];

export default function Hibak() {
  return (
    <>
      <p>Kétféle hiba van. A <strong>szintaktikai</strong> hiba miatt a program el sem indul. A <strong>futásidejű</strong> hiba megállítja a már futó programot. Mindkét esetben a felület megjelöli a hibás sort.</p>
      <h2 id="felepites">Mit tartalmaz egy hibaüzenet?</h2>
      <ul>
        <li><strong>Kód:</strong> például <code>S_NUMBER_RANGE</code> vagy <code>E_BAD_OPERAND</code>. A futásidejű kódok a kiírásból jönnek, a szintaktikaiak (<code>S_</code> kezdetűek) a mieink.</li>
        <li><strong>Pontos hely:</strong> sor, és azon belül a hibás rész oszloptartománya. A szerkesztő pontosan azt a tokent húzza alá, például a rossz típusú operandust vagy a nem létező változót.</li>
        <li><strong>Leírás:</strong> megnevezi a hibás tokent és értéket, például: „The left side of “+” must be an integer, but “flag” is a boolean (true).”</li>
        <li><strong>Javaslat:</strong> ha ismert a javítás, kész kódot ad, például összetett feltételnél: <code>set ok to i {"<"} 3</code>, utána <code>while ok</code>.</li>
        <li><strong>Kapcsolódó sorok:</strong> ahol a hiba oka van, például ahol a változó a típusát kapta, ahol az aranyat már kibányászták, vagy melyik <code>while</code> pörgött a lépéskorlátig.</li>
      </ul>
      <p>A teljes szerződés a repóban: <code>docs/diagnostics.md</code>.</p>

      <h2 id="szintaktikai">Szintaktikai hibák</h2>
      <p>
        A szerkesztő gépelés közben ellenőrzi a kódot, és a hibalistában kattintással a hibás sorra ugrik. A kód
        szerkesztés közben lehet hibás, de futtatás előtt helyesnek kell lennie.
      </p>
      <table>
        <thead><tr><th>Kód</th><th>Mikor?</th><th>Példa</th></tr></thead>
        <tbody>
          {SYNTAX.map(([code, when, sample]) => (
            <tr key={code}><td><code>{code}</code></td><td>{when}</td><td><code>{sample}</code></td></tr>
          ))}
        </tbody>
      </table>
      <p>Az egyes szabályok magyarázata:</p>
      <table>
        <thead><tr><th>Szabály</th><th>Példa</th></tr></thead>
        <tbody>
          <tr><td>Ismeretlen utasítás, rossz kis-nagybetű</td><td><code>Set x to 1</code>, <code>jump 1</code></td></tr>
          <tr><td>Rossz kötött kulcsszó</td><td><code>mine there</code>, <code>step 1</code></td></tr>
          <tr><td>Kulcsszó változónévként</td><td><code>set While to 1</code></td></tr>
          <tr><td>Literál 100 felett</td><td><code>set x to 101</code></td></tr>
          <tr><td>Összetett kifejezés, zárójel</td><td><code>set x to 1 + 2 + 3</code>, <code>while i {"<"} 3</code></td></tr>
          <tr><td>Dupla vagy sor végi szóköz</td><td><code>set x  to 1</code></td></tr>
          <tr><td>Tabulátor, üres sor</td><td>—</td></tr>
          <tr><td>Hibás behúzás, rossz helyen álló <code>else</code></td><td>lásd: <Link href="/docs/nyelv#behuzas">Behúzás</Link></td></tr>
        </tbody>
      </table>
      <Example id="keyword-case" />
      <Example id="double-space" />
      <Example id="indent-mismatch" />
      <Example id="else-bad" />

      <h2 id="futasideju">Futásidejű hibák</h2>
      <p>Ezek a hibák a kiírás 2.2.4 fejezetéből jönnek. Bármelyik bekövetkezésekor a program futása befejeződik, és a felület mutatja a hibakódot és a hibás sort.</p>
      <table>
        <thead><tr><th>Hibakód</th><th>Mikor?</th></tr></thead>
        <tbody>
          {RUNTIME.map((error) => (
            <tr key={error.code}><td><a href={`#${error.code}`}><code>{error.code}</code></a></td><td>{error.when}</td></tr>
          ))}
        </tbody>
      </table>
      {RUNTIME.map((error) => (
        <section key={error.code}>
          <h3 id={error.code}><code>{error.code}</code></h3>
          <p>{error.when}</p>
          <Example id={error.example} />
        </section>
      ))}

      <h2 id="import">Hibás importált fájlok</h2>
      <p>
        Program- vagy térképfájl importálásakor a hibás tartalom nem okozhat összeomlást, és nem töltődhet be. A térkép
        esetén érthető hibaüzenet jelenik meg, és a korábbi térkép marad. Hibás program betölthető a szerkesztőbe, mert
        szerkesztés közben a kód lehet hibás, de nem futtatható. Kipróbálható térképpéldák: <Link href="/docs/terkepek">Térképek</Link>.
      </p>
    </>
  );
}
