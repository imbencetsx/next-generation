import { describe, expect, test } from 'bun:test';
import { validateMineScript, isIdentifier } from '../../lib/minescript';
import { parseProgram } from '../../lib/interpreter';

// PDF §2 grammar / §2.1 tokenization; no runtime inference here.
const RESERVED = 'and by else false forward here if isThere mine not or print set step to true turn while'.split(' ');
describe('easy / PDF grammar', () => {
  for (const code of ['', 'print true', 'print false', 'set x to 1', 'set x to isThere 2', 'set x to not false', 'set x to a + b', 'mine here', 'step forward 0', 'turn by 100', 'if true', 'while false', 'if false\nelse']) {
    test(`accept ${JSON.stringify(code)}`, () => expect(validateMineScript(code)).toEqual([]));
  }
  for (let n = 0; n <= 100; n++) test(`literal ${n} is valid`, () => expect(validateMineScript(`print ${n}`)).toEqual([]));
  for (const word of RESERVED) for (const name of [word, word.toUpperCase(), word[0].toUpperCase() + word.slice(1)]) {
    test(`reserved name ${name}`, () => {
      expect(isIdentifier(name)).toBe(false);
      expect(validateMineScript(`set ${name} to 1`)[0]?.line).toBe(1);
    });
  }
  for (const name of ['a', 'A', 'arany', 'Arany', 'x0', 'robot100', 'constructor', 'toString', '__proto__', '_x', '1a', 'árany', 'x_y', 'x-y']) {
    test(`identifier alphabet: ${name}`, () => expect(isIdentifier(name)).toBe(/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)));
  }
});

describe('boundary / reject malformed source with the original line', () => {
  const bad = ['Set x to 1', 'set x to isthere 2', 'set x to TRUE', 'print 101', 'print -1', 'print 1.0', 'print 0x10', 'print 1e2', 'print (1)', 'print "a"', 'print 1;', 'print', 'print 1 2', 'step 1', 'step backward 1', 'step forward', 'turn 1', 'turn by', 'mine there', 'mine here 1', 'jump 1', 'isThere 1', 'set x 1', 'set x to', 'set x to 1 + 2 + 3', 'set x to not not true', 'set x to isThere 1 + 1', 'if a = b', 'while i < 3', 'else true', '# comment', 'print  1', 'print 1 ', 'print\t1', '\tprint 1', 'print\u00a01'];
  for (const code of bad) test(JSON.stringify(code), () => {
    const issues = validateMineScript(`print 0\n${code}`);
    expect(issues[0]?.line).toBe(2);
    expect(issues[0]?.message.length).toBeGreaterThan(0);
    expect(parseProgram(`print 0\n${code}`).ok).toBe(false);
  });
  for (const [source, line] of [['print 1\n\nprint 2', 2], ['\nprint 1', 1], ['print 1\n\n', 2], ['print 1\n  \nprint 2', 2]] as const) {
    test(`blank line ${JSON.stringify(source)}`, () => expect(validateMineScript(source)[0]?.line).toBe(line));
  }
  // D5 is provisional, not an additional PDF rule.
  test('D5: a single terminal newline is accepted', () => expect(validateMineScript('print 1\n')).toEqual([]));
  test('CRLF preserves source line numbering', () => expect(validateMineScript('print 1\r\nprint 101\r\n')[0]?.line).toBe(2));
  test('reports more than one independent error', () => expect(validateMineScript('jump 1\nprint 101').map(i => i.line)).toEqual([1, 2]));
  test('runtime-invalid statements are still syntactically legal', () => {
    for (const code of ['print missing', 'set x to true + y', 'if 1', 'while 0', 'turn by false', 'set x to 1\nset x to true']) expect(validateMineScript(code)).toEqual([]);
  });
});

describe('hard / indentation and else association (D1, D2)', () => {
  for (const width of [1, 2, 3, 4, 8]) test(`a block may indent by ${width} spaces`, () => expect(validateMineScript(`if true\n${' '.repeat(width)}print 1`)).toEqual([]));
  for (const code of ['if true\n    print 1\nif false\n print 2', 'if true\n   if false\n        print 1\n   else\n     print 2\nelse\n print 3', 'if true\nelse\nprint 1', 'while false\nprint 1', 'if true\n  if false\n  else\nelse']) {
    test(`valid nesting: ${JSON.stringify(code)}`, () => expect(validateMineScript(code)).toEqual([]));
  }
  for (const [code, line] of [
    [' print 1', 1], ['print 1\n  print 2', 2], ['if true\n    print 1\n  print 2', 3],
    ['else', 1], ['while true\nelse', 2], ['if true\n  print 1\n  else', 3],
    ['if true\nprint 1\nelse', 3], ['if true\nelse\nelse', 3],
    ['if true\n  if false\n    print 1\nprint 2\n  else', 5],
  ] as const) test(`invalid nesting: ${JSON.stringify(code)}`, () => expect(validateMineScript(code).some(i => i.line === line)).toBe(true));
});
