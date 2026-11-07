// Utolsó lépés: a blokkszerkezetből lapos utasításlista.
// A vezérlés a `next`/`whenTrue`/`whenFalse` indexeken halad, így a végrehajtáshoz nem kell verem.

import { END, type Instruction } from "./program";
import type { Node } from "./tree";

/**
 * Egy még nyitott ugrási cél. Egy blokk utolsó utasításánál még nem tudjuk, hová kell továbblépni;
 * a „kijárat” beírja a célindexet, amint a következő utasítás helye ismert.
 */
type Exit = (target: number) => void;

/** Csak hibátlan elemzés után hívható: hibás sort tartalmazó fánál kivételt dob. */
export function compile(root: Node[]): Instruction[] {
  const code: Instruction[] = [];

  /** Egymás utáni csomópontok: mindegyik kijáratait a következő utasítás elejére kötjük. */
  function emitBlock(nodes: Node[]): { entry: number | null; exits: Exit[] } {
    let entry: number | null = null;
    let exits: Exit[] = [];
    for (const node of nodes) {
      const index = code.length;
      for (const exit of exits) exit(index);
      entry ??= index;
      exits = emit(node);
    }
    return { entry, exits };
  }

  function emit(node: Node): Exit[] {
    switch (node.kind) {
      case "invalid":
        throw new Error("compile() called with syntax errors");

      case "if": {
        const instruction = { kind: "if" as const, span: node.span, cond: node.cond, whenTrue: END, whenFalse: END };
        code.push(instruction);

        const then = emitBlock(node.then);
        const exits = [...then.exits];
        // Üres then-ágnál igaz feltétel esetén az if utáni utasítás következik (D2).
        if (then.entry === null) {
          exits.push((target) => {
            instruction.whenTrue = target;
          });
        } else {
          instruction.whenTrue = then.entry;
        }

        if (node.else) {
          // Az else sora külön utasítás, mert lépésnek számít, ha az else ág fut.
          const elseLine = { kind: "else" as const, span: node.elseSpan!, next: END };
          instruction.whenFalse = code.length;
          code.push(elseLine);
          const otherwise = emitBlock(node.else);
          if (otherwise.entry === null) {
            exits.push((target) => {
              elseLine.next = target;
            });
          } else {
            elseLine.next = otherwise.entry;
          }
          exits.push(...otherwise.exits);
        } else {
          exits.push((target) => {
            instruction.whenFalse = target;
          });
        }
        return exits;
      }

      case "while": {
        const index = code.length;
        // Üres törzsnél a feltétel önmagára mutat: minden ellenőrzés egy feldolgozott sor (D2).
        const instruction = {
          kind: "while" as const,
          span: node.span,
          cond: node.cond,
          whenTrue: index,
          whenFalse: END,
        };
        code.push(instruction);
        const body = emitBlock(node.body);
        if (body.entry !== null) instruction.whenTrue = body.entry;
        // A törzs végéről mindig a feltételhez ugrunk vissza.
        for (const exit of body.exits) exit(index);
        return [
          (target) => {
            instruction.whenFalse = target;
          },
        ];
      }

      default: {
        const instruction = { ...node, next: END } as Instruction & { next: number };
        code.push(instruction);
        return [
          (target) => {
            instruction.next = target;
          },
        ];
      }
    }
  }

  const program = emitBlock(root);
  for (const exit of program.exits) exit(END);
  return code;
}
