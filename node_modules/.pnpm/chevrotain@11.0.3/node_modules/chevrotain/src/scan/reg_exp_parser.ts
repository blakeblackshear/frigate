import {
  Alternative,
  Assertion,
  Atom,
  Disjunction,
  RegExpParser,
  RegExpPattern,
} from "@chevrotain/regexp-to-ast";

let regExpAstCache: { [regex: string]: RegExpPattern } = {};
const regExpParser = new RegExpParser();

// this should be moved to regexp-to-ast
export type ASTNode =
  | RegExpPattern
  | Disjunction
  | Alternative
  | Assertion
  | Atom;

export function getRegExpAst(regExp: RegExp): RegExpPattern {
  const regExpStr = regExp.toString();
  if (regExpAstCache.hasOwnProperty(regExpStr)) {
    return regExpAstCache[regExpStr];
  } else {
    const regExpAst = regExpParser.pattern(regExpStr);
    regExpAstCache[regExpStr] = regExpAst;
    return regExpAst;
  }
}

export function clearRegExpParserCache() {
  regExpAstCache = {};
}
