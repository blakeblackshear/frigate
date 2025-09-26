import { cc } from "./utils.js";

export const digitsCharCodes: number[] = [];
for (let i = cc("0"); i <= cc("9"); i++) {
  digitsCharCodes.push(i);
}

export const wordCharCodes: number[] = [cc("_")].concat(digitsCharCodes);
for (let i = cc("a"); i <= cc("z"); i++) {
  wordCharCodes.push(i);
}

for (let i = cc("A"); i <= cc("Z"); i++) {
  wordCharCodes.push(i);
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#character-classes
export const whitespaceCodes: number[] = [
  cc(" "),
  cc("\f"),
  cc("\n"),
  cc("\r"),
  cc("\t"),
  cc("\v"),
  cc("\t"),
  cc("\u00a0"),
  cc("\u1680"),
  cc("\u2000"),
  cc("\u2001"),
  cc("\u2002"),
  cc("\u2003"),
  cc("\u2004"),
  cc("\u2005"),
  cc("\u2006"),
  cc("\u2007"),
  cc("\u2008"),
  cc("\u2009"),
  cc("\u200a"),
  cc("\u2028"),
  cc("\u2029"),
  cc("\u202f"),
  cc("\u205f"),
  cc("\u3000"),
  cc("\ufeff"),
];
