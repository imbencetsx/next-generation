export const DOC_PAGES = [
  {
    slug: "attekintes",
    title: "Áttekintés",
    description: "Mi ez az alkalmazás, hogyan működik, és hol tart a fejlesztés.",
  },
  {
    slug: "nyelv",
    title: "A MineScript nyelv",
    description: "Tokenek, típusok, kifejezések, feltételek, ciklusok és behúzás — helyes és hibás példákkal.",
  },
  {
    slug: "robot",
    title: "Robot API",
    description: "step, turn, mine, isThere és print: mit tud a robot, és mit lát a bányából.",
  },
  {
    slug: "terkepek",
    title: "Térképek",
    description: "A térképfájl formátuma és szabályai, a beépített pályák és a tervezett térképszerkesztő.",
  },
  {
    slug: "interpreter",
    title: "Az interpreter",
    description: "Hogyan ellenőrzi, dolgozza fel és futtatja a programot a motor, és hogyan számolja a lépéseket.",
  },
  {
    slug: "hibak",
    title: "Hibák",
    description: "Szintaktikai és futásidejű hibák, minden hibakódhoz kipróbálható példával.",
  },
  {
    slug: "dontesek",
    title: "Döntések és nyitott kérdések",
    description: "Ahol a kiírás nem egyértelmű, ott így döntöttünk.",
  },
] as const;

export type DocSlug = (typeof DOC_PAGES)[number]["slug"];
