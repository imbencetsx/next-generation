// A program blokkszerkezete a fordítás előtt: az elemző ezt építi fel a behúzásokból,
// a fordító pedig ebből készít lapos utasításlistát.

import type { Expr, Operand, Span } from "./program";

export type IfNode = {
  kind: "if";
  span: Span;
  /** Az if sor behúzása szóközökben; az else-nek ugyanennyivel kell kezdődnie (D1). */
  indent: number;
  cond: Operand;
  then: Node[];
  else?: Node[];
  elseSpan?: Span;
};

export type WhileNode = { kind: "while"; span: Span; cond: Operand; body: Node[] };

export type Node =
  | IfNode
  | WhileNode
  | { kind: "set"; span: Span; name: string; nameSpan: Span; expr: Expr }
  | { kind: "step" | "turn" | "print"; span: Span; arg: Operand }
  | { kind: "mine"; span: Span }
  /** Hibás sor helye: a szerkezet megmarad, így a további sorok is ellenőrizhetők. */
  | { kind: "invalid"; span: Span };
