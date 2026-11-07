// A behúzásból felépülő blokkszerkezet: a nyitott blokkok verme. Egy beljebb kezdődő sor megnyitja az
// előző sor (if, else, while) blokkját, egy kijjebb kezdődő sor lezárja a belső blokkokat.

import { plural, quote, type SyntaxIssue } from "../diagnostics";
import { syntaxIssue } from "./scanner";
import type { IfNode, Node, WhileNode } from "./tree";

/** Egy nyitott blokk: a behúzása és az a lista, ahová a sorai kerülnek. */
export type Block = {
  indent: number;
  body: Node[];
  kind: "root" | "if" | "else" | "while";
  owner: IfNode | WhileNode | null;
};

/** Blokknyitó sor (if, else, while) után a következő, beljebb kezdődő sor ezt a blokkot nyitja meg. */
export type PendingBlock = Omit<Block, "indent">;

/** Az előző nem üres sor, a hibaüzenetekhez. */
export type PreviousLine = { line: number; text: string };

export class BlockStack {
  private readonly stack: Block[];
  /** Az előző sor által nyitott, még üres blokk; a következő sor dönti el, belekerül-e. */
  pending: PendingBlock | null = null;

  constructor(root: Node[]) {
    this.stack = [{ indent: 0, body: root, kind: "root", owner: null }];
  }

  /** Az a blokk, ahová a mostani sor kerül. */
  get current(): Block {
    return this.stack.at(-1)!;
  }

  /**
   * Egy új sor behúzása alapján megnyitja a várakozó blokkot, vagy lezárja a belső blokkokat.
   * Ha a behúzás nem illeszkedik, a hibát adja vissza (a sor ilyenkor a legközelebbi blokkba kerül).
   */
  enter(line: number, indent: number, previous: PreviousLine | null): SyntaxIssue | null {
    const pending = this.pending;
    this.pending = null;

    if (indent > this.current.indent) {
      if (pending) {
        this.stack.push({ indent, ...pending });
        return null;
      }
      return unexpectedIndent(line, indent, previous);
    }

    const openIndents = this.stack.map((block) => block.indent);
    while (this.stack.length > 1 && indent < this.current.indent) this.stack.pop();
    if (indent === this.current.indent) return null;
    return syntaxIssue(
      "S_INDENT_MISMATCH",
      line,
      1,
      indent + 1,
      `The indentation (${plural(indent, "space")}) does not match any open block. Valid indentations here: ${openIndents.join(" or ")} spaces.`,
      "Within a block every line must be indented the same way; when a block ends, go back to exactly the indentation of an outer block.",
    );
  }
}

function unexpectedIndent(line: number, indent: number, previous: PreviousLine | null): SyntaxIssue {
  if (!previous) {
    return syntaxIssue(
      "S_UNEXPECTED_INDENT",
      line,
      1,
      indent + 1,
      "The first line must not be indented.",
      "Remove the indentation so the line starts in column 1.",
    );
  }
  return syntaxIssue(
    "S_UNEXPECTED_INDENT",
    line,
    1,
    indent + 1,
    `This line is indented by ${plural(indent, "space")}, but the previous instruction ${quote(previous.text)} (line ${previous.line}) does not open a block.`,
    "Only if, else and while can be followed by an indented block. Remove the extra indentation.",
    [{ line: previous.line, message: "previous instruction" }],
  );
}
