// A MineScript forráskód elemzése. Ez az egyetlen elemző: a szintaktikai ellenőrzés és a futtatható
// program ugyanabból az egy menetből készül, így a kettő nem térhet el egymástól.
//
// Lépések, fájlonként:
//   scanner.ts      egy sor → behúzás és tokenek (formai hibák: tab, szóközök, tiltott karakter)
//   line-parser.ts  tokenek → egy utasítás (kulcsszavak, értékek, kifejezések)
//   analyze.ts      sorok → blokkszerkezet a behúzások alapján, else párosítása, hibák gyűjtése
//   compiler.ts     blokkszerkezet → lapos utasításlista ugrási indexekkel
// A hibák alakja: docs/diagnostics.md.

export { analyzeSource, type Analysis } from "./analyze";
export { END, type Expr, type Instruction, type Operand, type Program, type Span } from "./program";
export { KEYWORDS, OPERATORS, TOKEN_PATTERNS, isBooleanLiteral, isIdentifier, type Operator } from "./vocabulary";
