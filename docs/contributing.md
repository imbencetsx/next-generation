# Közreműködői útmutató

Először a gyökérben lévő `AGENTS.md` fájlt olvasd el: a kiírás szabályai, a nyitott kérdések és a
kódolási konvenciók ott vannak. Ez az útmutató a forráskód bejárásához ad kiindulópontokat.

## Egy program útja

1. A `components/workbench/use-program-file.ts` kezeli a szerkesztett forrást és a fájlműveleteket.
2. A `components/code-editor/index.tsx` köti a CodeMirrort a Reacthez. A `minescript-mode.ts` adja a
   nyelvi színezést, kiegészítést, behúzást és lintet. A lint ugyanazt a validátort hívja, mint a futtatás.
3. A `lib/minescript.ts` `validateMineScript()` függvénye a `lib/syntax/analyze.ts` elemzőjének vékony belépési pontja.
4. A `scanner.ts` pontos tokenhelyeket készít. A `line-parser.ts` egy sor utasítását olvassa be;
   az `expressions.ts` és a `values.ts` a jobb oldali kifejezéseket és egyszerű értékeket kezeli.
5. Az `analyze.ts` fogja össze a sorokat. A `block-stack.ts` követi a behúzásokat, az `else-branch.ts`
   párosítja az `else` ágakat és kezeli a hibás párosítások diagnosztikáját. Hibás sor után is folytatjuk
   az ellenőrzést, de hibás programból nem készül futtatható utasításlista.
6. A `compiler.ts` lapos `Instruction[]` listát készít. Az ugrási célok ismertek: futáskor már nincs AST-bejárás.
7. A `lib/interpreter.ts` `Machine` osztálya hajtja végre a listát. Egy `step()` egy feldolgozott
   programsor, nem egy térképmező. A `StepEvent` az animálható esemény, a `Snapshot` a teljes állapot másolata.
8. A `components/use-simulation.ts` indítja a gépet és az időzítőt. A `robot-motion.ts` a mozgás
   megjelenítési idejét számolja ki; a `pixel-map.tsx` csak kirajzolja az állapotot.

Egy utasítás követéséhez a `vocabulary.ts`, `line-parser.ts`, `tree.ts`, `compiler.ts`, `program.ts`
és az interpreter a releváns fájlok. A meglévő nyelv bővítése előtt egyeztess: a verseny nyelvtana rögzített.

## A rétegek határai

- **`lib/`**: a nyelv és a játék szabályai. Nincs React, DOM, adatbázis, időzítő vagy hálózati kérés.
  A diagnosztikák angolul maradnak a rögzített hibakódokkal; a specifikációs sorrend megfigyelhető viselkedés.
- **`components/`**: felhasználói műveletek és megjelenítés. A React nem számolja újra az aranyat vagy a
  futás lépésszámát. A motor pillanatképét használja.
- **`app/`**: útvonalak és szolgáltatók összekötése. A védett oldalak `AppProviders` alatt vannak;
  a dokumentáció statikus és magyar. A `/test` csak régi cím, a munkafelület `/workbench`.
- **`convex/`**: bejelentkezés, profil és tárolás. A hívó azonosítója a munkamenetből származik.
  A `users` tábla a megjelenített nevet, az `authAccounts` a bejelentkezési nevet és a jelszó hashét tárolja.
  A névváltoztatás mindkettőt egy tranzakcióban frissíti.
- **`i18n/`**: az alkalmazás EN/HU szótára. Az angol alak adja a `Messages` típust, a magyar szótárnak
  ugyanazokat a kulcsokat kell tartalmaznia. A dokumentáció magyar prózája külön, a `components/docs/` alatt él.

## Gyakori módosítások

| Feladat | Hol és mire figyelj? |
| --- | --- |
| Felirat vagy új űrlapmező | `i18n/en.ts` és `i18n/hu.ts`; a komponensben `useI18n().t`. |
| Új dokumentációs példa | `lib/docs/examples.ts`, majd `<Example id="…" />`. A várt eredményt a szabályokból számold, és futtasd a `test:docs` csomagot. |
| Hibajelölés javítása | `lib/diagnostics.ts`, `lib/syntax/`, `docs/diagnostics.md`; az oszlopok 1-től indulnak, a végük kizáró. |
| Új oldal | `app/`, `lib/routes.ts`. Védett oldalnál `proxy.ts`; a statikus matcher ismétlődését a `tests/tooling/routes.test.ts` ellenőrzi. |
| Sprite cseréje | `public/sprites/`, `components/sprites.ts`; az átlátszó aranyképeket a `scripts/cut-gold-chips.py` állítja elő. |
| Convex függvény | Előbb `convex/_generated/ai/guidelines.md`; autentikáció, argumentum- és visszatérési validátor, megfelelő index. A generált fájlokat a CLI írja. |

## Ellenőrzés és hibakeresés

Használd a `bun run test:related -- <módosított-fájlok>` parancsot. Az ismeretlen fájl szándékosan hibát ad:
ilyenkor bővítsd a `scripts/test-groups.ts` hozzárendelését, vagy válassz kifejezetten tesztcsoportot.
Az összes tesztet a `bun run test` futtatja; a részletes katalógus a `docs/testing.md` fájlban van.

Motorhiba vizsgálatához előbb készíts minimális MineScript-programot és kis térképet. Ellenőrizd a
hibakódot, a forrássort és a lépésszámot is. A teszt nem származtathatja a várt eredményt a motorból:
a `tests/adversarial/model.ts` ezért szándékosan önálló referencia-interpreter és generátor.

A formázást, lintet és buildet a README parancsai szerint ellenőrizd. A typecheck a builddel ne fusson
párhuzamosan, mert a Next.js közben újragenerálja az útvonaltípusait.
Egy zöld motorteszt nem ellenőrzi a React vezérlőit, a feltöltést vagy a bejelentkezést;
a Vitest profiltesztek sem helyettesítenek egy teljes böngészős ellenőrzést.

Az auth/profil hibák a `convex/errors.ts` adapterén át jutnak a fordításhoz. A közvetlen Convex-hívás
megőrzi a `ConvexError({ code })` adatát; a `/api/auth` proxy csak szöveget ad tovább. Az adapter ezt
a könyvtári eltérést kezeli, a komponensek nem keresnek hibaüzenet-részleteket.

Változtatáskor törekedj egyetlen jól körülírt feladatra. A magyar komment azt magyarázza el, miért kell
valami, ne azt ismételje, amit a kód már kimond. A commit üzenete is magyar; az azonosítók angolok maradnak.
