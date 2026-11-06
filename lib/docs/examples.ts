// A dokumentáció kipróbálható példái és az elvárt eredményeik.

import type { SyntaxIssue } from "@/lib/minescript";
import { Machine, parseProgram, type ErrorCode, type Snapshot } from "@/lib/interpreter";
import { MAP_PRESETS, parseMap, type GameMap } from "@/lib/robot-map";

export const DOC_MAPS = {
  corridor: { name: "Folyosó", text: MAP_PRESETS[0].text },
  spec: { name: "PDF példatérkép", text: "3 15\n....@..........\n.#############.\n.......@...>..." },
} as const;
export type DocMapId = keyof typeof DOC_MAPS;

export type Expectation =
  | { kind: "ok"; output?: string[]; steps?: number; mined?: number }
  | { kind: "syntax"; line: number }
  | { kind: "runtime"; code: ErrorCode; line: number };

export type DocExample = {
  title: string;
  code: string;
  expect: Expectation;
  map?: DocMapId;
  /** A robot mozgását bemutató példák mellé térképet is teszünk. */
  showMap?: boolean;
};

export type Outcome =
  | { kind: "syntax"; issues: SyntaxIssue[] }
  | { kind: "run"; snapshot: Snapshot; map: GameMap };

export function loadDocMap(id: DocMapId = "corridor"): GameMap {
  const result = parseMap(DOC_MAPS[id].text);
  if (!result.ok) throw new Error(`Invalid docs map ${id}: ${result.error}`);
  return result.map;
}

// Nincs animációs várakozás; a végtelen ciklusokat a motor 1000 soros korlátja állítja meg.
export function runExample(code: string, mapId: DocMapId = "corridor"): Outcome {
  const parsed = parseProgram(code);
  if (!parsed.ok) return { kind: "syntax", issues: parsed.issues };

  const map = loadDocMap(mapId);
  const machine = new Machine(parsed.program, map);
  while (machine.status === "running") {
    machine.step();
  }
  return { kind: "run", snapshot: machine.snapshot(), map };
}

export function matchesExpectation(outcome: Outcome, expected: Expectation): boolean {
  if (expected.kind === "syntax") {
    return outcome.kind === "syntax" && outcome.issues[0]?.line === expected.line;
  }
  if (outcome.kind !== "run") return false;

  const { snapshot } = outcome;
  if (expected.kind === "runtime") {
    return snapshot.error?.code === expected.code && snapshot.error.line === expected.line;
  }

  if (snapshot.status !== "done") return false;
  if (expected.steps !== undefined && snapshot.steps !== expected.steps) return false;
  if (expected.mined !== undefined && snapshot.mined !== expected.mined) return false;
  if (expected.output !== undefined) {
    return expected.output.length === snapshot.output.length
      && expected.output.every((line, index) => line === snapshot.output[index]);
  }
  return true;
}

export function describeExpectation(expect: Expectation): string {
  if (expect.kind === "syntax") return `Szintaktikai hiba a(z) ${expect.line}. sorban — a program nem indul el.`;
  if (expect.kind === "runtime") return `Futásidejű hiba: ${expect.code} a(z) ${expect.line}. sorban.`;
  const parts = ["Hiba nélkül lefut"];
  if (expect.output) parts.push(expect.output.length ? `kimenet: ${expect.output.join(", ")}` : "nincs kimenet");
  if (expect.steps !== undefined) parts.push(`${expect.steps} feldolgozott sor`);
  if (expect.mined !== undefined) parts.push(`${expect.mined} arany`);
  return parts.join(" · ") + ".";
}

export const DOC_EXAMPLES = {
  "pdf-program": {
    title: "A PDF fő példaprogramja: előre a falig, közben bányászik",
    code: `set count to 0
set fal to isThere 1
set megy to not fal
while megy
  set arany to isThere 2
  if arany
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set fal to isThere 1
  set megy to not fal
print count`,
    expect: { kind: "ok", output: ["3"], steps: 64, mined: 3 },
    showMap: true,
  },

  "pdf-hello": {
    title: "A PDF első példája",
    code: "set arany to isThere 2\nprint arany",
    expect: { kind: "ok", output: ["false"], steps: 2 },
    map: "spec",
    showMap: true,
  },
  "case-sensitive": {
    title: "Az arany és az Arany két külön változó",
    code: "set arany to 1\nset Arany to 2\nprint arany\nprint Arany",
    expect: { kind: "ok", output: ["1", "2"] },
  },
  "keyword-case": {
    title: "A kulcsszavak kis- és nagybetűérzékenyek",
    code: "Set x to 1",
    expect: { kind: "syntax", line: 1 },
  },
  "isthere-case": {
    title: "isthere helyett isThere kell",
    code: "set x to isthere 2",
    expect: { kind: "syntax", line: 1 },
  },
  "reserved-ident": {
    title: "Kulcsszó semmilyen betűméretben nem lehet változónév",
    code: "set While to 1",
    expect: { kind: "syntax", line: 1 },
  },
  "literal-max": {
    title: "A 100 még megengedett literál",
    code: "set x to 100\nprint x",
    expect: { kind: "ok", output: ["100"] },
  },
  "literal-over": {
    title: "A 101 már nem írható a kódba",
    code: "set x to 101",
    expect: { kind: "syntax", line: 1 },
  },
  "computed-range": {
    title: "Számolt érték lehet negatív vagy 100 feletti",
    code: "set x to 0 - 5\nprint x\nset y to 100 * 100\nprint y",
    expect: { kind: "ok", output: ["-5", "10000"] },
  },
  "chained": {
    title: "Nincs láncolt művelet",
    code: "set x to 1 + 2 + 3",
    expect: { kind: "syntax", line: 1 },
  },
  "parenthesis": {
    title: "Nincs zárójelezés",
    code: "set x to (1)",
    expect: { kind: "syntax", line: 1 },
  },
  "while-expr": {
    title: "A while után nem állhat kifejezés",
    code: "set i to 0\nwhile i < 3\n  set i to i + 1",
    expect: { kind: "syntax", line: 2 },
  },
  "while-fixed": {
    title: "Helyesen: a feltételt előbb változóba számoljuk",
    code: "set i to 0\nset megy to i < 3\nwhile megy\n  set i to i + 1\n  set megy to i < 3\nprint i",
    expect: { kind: "ok", output: ["3"], steps: 13 },
  },
  "double-space": {
    title: "Két szóköz a tokenek között",
    code: "set x  to 1",
    expect: { kind: "syntax", line: 1 },
  },
  "tab-indent": {
    title: "Tabulátor a behúzásban",
    code: "set a to true\nif a\n\tprint 1",
    expect: { kind: "syntax", line: 3 },
  },
  "empty-line": {
    title: "Üres sor a programban",
    code: "set x to 1\n\nprint x",
    expect: { kind: "syntax", line: 2 },
  },
  "indent-no-opener": {
    title: "Behúzás blokknyitó nélkül",
    code: "set a to 1\n  print a",
    expect: { kind: "syntax", line: 2 },
  },
  "indent-mismatch": {
    title: "Visszahúzás nem létező szintre",
    code: "set a to true\nif a\n    print 1\n  print 2",
    expect: { kind: "syntax", line: 4 },
  },
  "else-good": {
    title: "Az else az if sorával egy szinten áll",
    code: "set a to false\nif a\n  print 1\nelse\n  print 2",
    expect: { kind: "ok", output: ["2"], steps: 4 },
  },
  "else-bad": {
    title: "Az else nem állhat a törzs szintjén",
    code: "set a to false\nif a\n  print 1\n  else\n  print 2",
    expect: { kind: "syntax", line: 4 },
  },
  "block-indents": {
    title: "Blokkonként eltérő behúzási mérték",
    code: "set a to true\nif a\n    print 1\nif a\n  print 2",
    expect: { kind: "ok", output: ["1", "2"] },
  },
  "empty-block": {
    title: "Üres blokk megengedett",
    code: "set a to true\nif a\nprint 1",
    expect: { kind: "ok", output: ["1"], steps: 3 },
  },
  "empty-program": {
    title: "Az üres program is szabályos",
    code: "",
    expect: { kind: "ok", output: [], steps: 0 },
  },

  "type-lock": {
    title: "A változó típusa rögzül",
    code: "set x to 1\nset x to true",
    expect: { kind: "runtime", code: "E_TYPE_MISMATCH", line: 2 },
  },
  "uninit": {
    title: "Értékadás előtt nem olvasható",
    code: "print y",
    expect: { kind: "runtime", code: "E_UNINITIALIZED", line: 1 },
  },
  "no-short-circuit": {
    title: "Nincs rövidzár: a második operandust is beolvassa",
    code: "set x to true or y",
    expect: { kind: "runtime", code: "E_UNINITIALIZED", line: 1 },
  },
  "operand-order": {
    title: "Az első operandus típusát azonnal ellenőrzi",
    code: "set x to true + y",
    expect: { kind: "runtime", code: "E_BAD_OPERAND", line: 1 },
  },
  "eq-types": {
    title: "Egyenlőség csak azonos típusok között",
    code: "set x to 1 = true",
    expect: { kind: "runtime", code: "E_BAD_OPERAND", line: 1 },
  },
  "eq-reads-second": {
    title: "Az = előbb beolvassa mindkét operandust",
    code: "set x to true = y",
    expect: { kind: "runtime", code: "E_UNINITIALIZED", line: 1 },
  },
  "eq-bool": {
    title: "Egyenlőségvizsgálat logikai értékekkel",
    code: "set x to true = false\nprint x",
    expect: { kind: "ok", output: ["false"] },
  },
  "not-int": {
    title: "A not csak logikai értékre működik",
    code: "set x to not 1",
    expect: { kind: "runtime", code: "E_BAD_OPERAND", line: 1 },
  },
  "non-bool": {
    title: "Az if feltétele nem lehet egész",
    code: "set n to 1\nif n\n  print n",
    expect: { kind: "runtime", code: "E_NON_BOOL_CONDITION", line: 2 },
  },
  "dead-branch": {
    title: "Le nem futó ágban nincs hiba",
    code: "set a to false\nif a\n  set x to true + 1\nprint a",
    expect: { kind: "ok", output: ["false"] },
  },

  "turn-left": {
    title: "A turn balra fordít",
    code: "turn by 1\nset fal to isThere 1\nprint fal",
    expect: { kind: "ok", output: ["true"] },
    showMap: true,
  },
  "turn-four": {
    title: "A turn by 4 körbefordul",
    code: "turn by 4\nset ures to isThere 0\nprint ures",
    expect: { kind: "ok", output: ["true"] },
    showMap: true,
  },
  "step-over-gold": {
    title: "Átlépett aranyrög a helyén marad",
    code: "step forward 3",
    expect: { kind: "ok", steps: 1, mined: 0 },
    showMap: true,
  },
  "step-zero": {
    title: "A step forward 0 nem mozdít",
    code: "step forward 0",
    expect: { kind: "ok", steps: 1 },
  },
  "mine-ok": {
    title: "Bányászás aranyrögön",
    code: "step forward 2\nmine here",
    expect: { kind: "ok", steps: 2, mined: 1 },
    showMap: true,
  },
  "mine-none": {
    title: "Bányászás arany nélkül",
    code: "mine here",
    expect: { kind: "runtime", code: "E_NO_GOLD", line: 1 },
  },
  "mine-twice": {
    title: "Ugyanaz a rög kétszer nem bányászható",
    code: "step forward 2\nmine here\nmine here",
    expect: { kind: "runtime", code: "E_NO_GOLD", line: 3 },
  },
  "step-partial": {
    title: "Falba ütközés menet közben",
    code: "step forward 20",
    expect: { kind: "runtime", code: "E_BEDROCK_HIT", line: 1 },
    showMap: true,
  },
  "off-map": {
    title: "Lelépés a térképről",
    code: "turn by 2\nstep forward 1",
    expect: { kind: "runtime", code: "E_BEDROCK_HIT", line: 2 },
    showMap: true,
  },
  "edge-wall": {
    title: "A térkép széle falnak számít",
    code: "turn by 2\nset w to isThere 1\nprint w",
    expect: { kind: "ok", output: ["true"] },
  },
  "isthere-zero-gold": {
    title: "Az aranyat tartalmazó kamra nem üres",
    code: "step forward 1\nset ures to isThere 0\nset arany to isThere 2\nprint ures\nprint arany",
    expect: { kind: "ok", output: ["false", "true"] },
    showMap: true,
  },
  "bad-arg-turn": {
    title: "turn by logikai értékkel",
    code: "turn by true",
    expect: { kind: "runtime", code: "E_BAD_ARG", line: 1 },
  },
  "bad-arg-isthere": {
    title: "isThere érvénytelen fajtával",
    code: "set w to 3\nset x to isThere w",
    expect: { kind: "runtime", code: "E_BAD_ARG", line: 2 },
  },
  "bad-arg-step": {
    title: "Negatív lépésszám",
    code: "set n to 0 - 1\nstep forward n",
    expect: { kind: "runtime", code: "E_BAD_ARG", line: 2 },
  },

  "count-else-false": {
    title: "Lefutó else ág: az else sora is számít",
    code: "set a to false\nif a\n  print 1\nelse\n  print 2",
    expect: { kind: "ok", output: ["2"], steps: 4 },
  },
  "count-else-true": {
    title: "Igaz feltétel: az else sora nem számít",
    code: "set a to true\nif a\n  print 1\nelse\n  print 2",
    expect: { kind: "ok", output: ["1"], steps: 3 },
  },
  "limit-exact": {
    title: "Pontosan 1000 sor: sikeres futás",
    code: "set i to 0\nset lim to 83 * 4\nset megy to i < lim\nwhile megy\n  set i to i + 1\n  set megy to i < lim",
    expect: { kind: "ok", steps: 1000 },
  },
  "limit-over": {
    title: "1003 sorra lenne szükség: megszakad",
    code: "set i to 0\nset lim to 37 * 9\nset megy to i < lim\nwhile megy\n  set i to i + 1\n  set megy to i < lim",
    expect: { kind: "runtime", code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED", line: 5 },
  },
  "infinite": {
    title: "Végtelen ciklus",
    code: "set r to true\nwhile r\n  set r to true",
    expect: { kind: "runtime", code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED", line: 3 },
  },
  "empty-while": {
    title: "Üres törzsű while",
    code: "set r to true\nwhile r\nprint r",
    expect: { kind: "runtime", code: "INSTRUCTION_COUNT_LIMIT_EXCEEDED", line: 2 },
  },
} satisfies Record<string, DocExample>;

export type DocExampleId = keyof typeof DOC_EXAMPLES;
