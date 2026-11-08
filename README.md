# MineScript robotszimulátor

Böngészős programozós játék: egy kincskereső robotot irányítasz egy saját, soronként végrehajtott nyelven.
A Next.js felülethez Convex háttérrendszer tartozik. A tiszta TypeScript motor a böngészőben és a
tesztekben ugyanaz; nem fordítja JavaScriptre a játékos programját.

A Dusza Árpád Országos Programozói Emlékverseny 2026/2027 webes fordulójára készül.
A követelmények és a csapat döntései az [AGENTS.md](AGENTS.md) fájlban olvashatók.

## Helyi indítás

Bun 1.3 és egy Convex fejlesztői projekt szükséges.

```sh
bun install
bun run convex:dev
```

Az első Convex-indításnál válassz fejlesztői projektet. A CLI létrehozza a `.env.local` kapcsolati
beállításait és frissíti a generált típusokat. A [`.env.example`](.env.example) leírja a változókat.
A hitelesítés kulcsait egyszer kell beállítani a fejlesztői deploymenten:

```sh
bun run auth:setup -- --site-url http://localhost:3000
```

Ezután külön terminálban indítsd a felületet:

```sh
bun dev
```

Nyisd meg a [localhost:3000](http://localhost:3000) címet, és regisztrálj saját fiókot.
A munkafelület `/workbench`, a profil `/profile`, a magyar nyelvi dokumentáció `/docs` alatt érhető el.
A régi `/test` cím átirányít a munkafelületre.

Az auth kulcsok a Convex deploymenten élnek, nem a repóban. Éles telepítéshez az [AGENTS.md](AGENTS.md)
telepítési fejezete ad útmutatót. A helyi fejlesztés és a Vercel béta szándékosan ugyanazt a fejlesztői
adatbázist használja.

## Hol kezdj olvasni?

| Amit meg szeretnél érteni | Belépési pont |
| --- | --- |
| A felület és a szerkesztő kapcsolata | `app/workbench/page.tsx` → `components/workbench/index.tsx` |
| Programfájlok megnyitása, mentése | `components/workbench/use-program-file.ts` |
| Kódszínezés, kiegészítés, hibajelölés | `components/code-editor/minescript-mode.ts` |
| MineScript értelmezése | `lib/syntax/analyze.ts` → `compiler.ts` → `lib/interpreter.ts` |
| Futtatás, léptetés és animáció | `components/use-simulation.ts` → `robot-motion.ts` → `pixel-map.tsx` |
| Térképek formátuma és mintapályák | `lib/robot-map.ts` |
| Bejelentkezés és profilmódosítás | `convex/auth.ts`, `convex/users.ts` |
| Fordítható feliratok | `i18n/en.ts`, `i18n/hu.ts` |

A [közreműködői útmutató](docs/contributing.md) végigvezet egy program útján, a rétegek határain
és a gyakori módosítások helyén. A részletes fájltérkép az [AGENTS.md](AGENTS.md) része.

## Ellenőrzés módosítás után

```sh
bun run format
bun run lint
bunx tsc --noEmit
bun run build
```

Ne futtasd egyszerre a typechecket és a buildet: a build újraírja a Next.js generált útvonaltípusait.
A build Google Sans fallback-figyelmeztetése ismert; nem a játékmotor hibája.

A módosított fájlokból választható tesztcsomag:

```sh
bun run test:related -- lib/interpreter.ts
bun run test:related -- convex/users.ts
bun run test:docs
bun run test
```

A motorhoz Bun natív tesztfuttató, a Convex/profil tesztekhez Vitest tartozik; a `test:related` és a
`test` parancs mindkettőt kezeli. A [tesztelési útmutató](docs/testing.md) leírja a csoportokat és a határaikat.

## Jelenlegi határok

A szerkesztő, a nyelvi motor, a szimulátor, a térképszerkesztő, a bejelentkezés és a profiloldal működik.
A térképek/programok/futások tartós mentése és a ranglista még tervezett funkció.
A MineScript jelentése és pontozása rögzített: refaktoráláskor is őrizd meg a hibakódokat, a forrássorokat,
az értékelési sorrendet és a feldolgozott sorok számát.

- [Nyelvi szerződés](docs/minescript-language.md)
- [Diagnosztikai szerződés](docs/diagnostics.md)
- [Tesztelési útmutató](docs/testing.md)
