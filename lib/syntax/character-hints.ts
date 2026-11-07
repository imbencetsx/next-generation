// Hibaüzenet és javaslat a MineScriptben nem használható karakterekhez: láthatatlan szóközök,
// más nyelvekből ismerős jelek (megjegyzés, zárójel, pontosvessző…) és ékezetes betűk.

import { quote } from "../diagnostics";
import { isIdentifier } from "./vocabulary";

/** Gyakori láthatatlan karakterek, amelyek másolással kerülnek a kódba. */
const INVISIBLE_CHARACTER_NAMES: Record<string, string> = {
  " ": "non-breaking space",
  "​": "zero-width space",
  " ": "thin space",
  "　": "ideographic space",
  "﻿": "byte order mark",
};

/** Javaslat egy-egy más nyelvekből ismerős, de a MineScriptben nem létező karakterhez. */
const CHARACTER_HINTS: Record<string, string> = {
  "#": "MineScript has no comments. Remove the comment from the program.",
  "/": "MineScript has no comments and no division (the operators are + - and *). Remove the “/”.",
  "!": "Use <> for “not equal” and not for negation, e.g. set open to not wall.",
  "&": "Use and, e.g. set both to a and b.",
  "|": "Use or, e.g. set either to a or b.",
  ".": "Numbers are whole numbers from 0 to 100, without a decimal point.",
  ",": "Numbers are whole numbers from 0 to 100, without a decimal point.",
  "(": "There are no parentheses. Split the calculation into several set lines.",
  ")": "There are no parentheses. Split the calculation into several set lines.",
  "[": "There are no brackets or braces. Blocks are marked by indentation.",
  "]": "There are no brackets or braces. Blocks are marked by indentation.",
  "{": "There are no brackets or braces. Blocks are marked by indentation.",
  "}": "There are no brackets or braces. Blocks are marked by indentation.",
  ":": "No colon is needed: the block after if, else or while is marked by indentation only.",
  ";": "No semicolons: every instruction is on its own line.",
  '"': "There are no strings. print can only print integers and booleans.",
  "'": "There are no strings. print can only print integers and booleans.",
  "`": "There are no strings. print can only print integers and booleans.",
  "%": "Only + - and * are available.",
  "^": "Only + - and * are available.",
  "_": "Variable names may contain only letters and digits.",
};

export function describeInvalidCharacter(char: string, token: string): { message: string; hint?: string } {
  const codePoint = char.codePointAt(0)!;
  const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
  const invisibleName = INVISIBLE_CHARACTER_NAMES[char];

  if (/\s/.test(char) || invisibleName || codePoint < 32) {
    return {
      message: `Invalid invisible character ${code}${invisibleName ? ` (${invisibleName})` : ""}.`,
      hint: "Only the normal space may separate tokens. Delete it and type a regular space.",
    };
  }

  const message = `Invalid character ${quote(char)} (${code}).`;
  if (char in CHARACTER_HINTS) return { message, hint: CHARACTER_HINTS[char] };

  // Ékezetes betűnél az ékezet nélküli alakot javasoljuk, ha az érvényes név.
  if (/\p{L}/u.test(char)) {
    const ascii = token.normalize("NFD").replace(/\p{M}/gu, "");
    return {
      message: `Invalid character ${quote(char)} (${code}): names may only use the English letters a–z and A–Z and digits.`,
      hint: isIdentifier(ascii) ? `Write ${quote(ascii)} instead.` : undefined,
    };
  }
  return { message };
}
