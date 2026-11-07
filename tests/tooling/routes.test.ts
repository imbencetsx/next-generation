import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { ROUTES } from "../../lib/routes";

// A proxy.ts `config.matcher` listája szó szerinti érték (a Next.js statikusan olvassa), ezért nem
// használhatja a ROUTES-t. Ez a teszt őrzi, hogy a kettő ne csússzon szét. A proxy.ts-t nem importáljuk
// (a Next.js szervermoduljai csak a Next futtatókörnyezetében töltődnek be), hanem a TypeScript
// elemzőjével olvassuk ki a `config` objektum `matcher` tömbjét.
function proxyMatcher(): string[] {
  const path = new URL("../../proxy.ts", import.meta.url);
  const source = ts.createSourceFile("proxy.ts", readFileSync(path, "utf8"), ts.ScriptTarget.Latest);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) !== "config" || !declaration.initializer) continue;
      if (!ts.isObjectLiteralExpression(declaration.initializer)) continue;
      const matcher = declaration.initializer.properties.find(
        (property) => ts.isPropertyAssignment(property) && property.name.getText(source) === "matcher",
      );
      if (matcher && ts.isPropertyAssignment(matcher) && ts.isArrayLiteralExpression(matcher.initializer)) {
        return matcher.initializer.elements.map((element) => (element as ts.StringLiteral).text);
      }
    }
  }
  throw new Error("proxy.ts: config.matcher not found");
}

test("proxy matcher covers every session-dependent route", () => {
  expect(proxyMatcher()).toEqual([
    ROUTES.home,
    `${ROUTES.workbench}/:path*`,
    `${ROUTES.profile}/:path*`,
    `${ROUTES.mapEditor}/:path*`,
    `${ROUTES.maps}/:path*`,
    ROUTES.login,
    "/api/auth",
  ]);
});

test("the docs stay outside the proxy so they can be prerendered", () => {
  expect(proxyMatcher().some((path) => path.startsWith(ROUTES.docs))).toBe(false);
});
