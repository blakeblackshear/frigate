import type {
  Alternative,
  Assertion,
  Atom,
  Character,
  Disjunction,
  Group,
  GroupBackReference,
  Location,
  Quantifier,
  Range,
  RegExpFlags,
  RegExpPattern,
  Set,
  Term,
} from "../types";
import {
  addFlag,
  ASSERT_EXISTS,
  ASSERT_NEVER_REACH_HERE,
  cc,
  insertToSet,
  isCharacter,
} from "./utils.js";
import {
  digitsCharCodes,
  whitespaceCodes,
  wordCharCodes,
} from "./character-classes.js";

// consts and utilities
const hexDigitPattern = /[0-9a-fA-F]/;
const decimalPattern = /[0-9]/;
const decimalPatternNoZero = /[1-9]/;

// https://hackernoon.com/the-madness-of-parsing-real-world-javascript-regexps-d9ee336df983
// https://www.ecma-international.org/ecma-262/8.0/index.html#prod-Pattern
export class RegExpParser {
  protected idx: number = 0;
  protected input: string = "";
  protected groupIdx: number = 0;

  protected saveState() {
    return {
      idx: this.idx,
      input: this.input,
      groupIdx: this.groupIdx,
    };
  }

  protected restoreState(newState: {
    idx: number;
    input: string;
    groupIdx: number;
  }) {
    this.idx = newState.idx;
    this.input = newState.input;
    this.groupIdx = newState.groupIdx;
  }

  public pattern(input: string): RegExpPattern {
    // parser state
    this.idx = 0;
    this.input = input;
    this.groupIdx = 0;

    this.consumeChar("/");
    const value = this.disjunction();
    this.consumeChar("/");

    const flags: RegExpFlags = {
      type: "Flags",
      loc: { begin: this.idx, end: input.length },
      global: false,
      ignoreCase: false,
      multiLine: false,
      unicode: false,
      sticky: false,
    };

    while (this.isRegExpFlag()) {
      switch (this.popChar()) {
        case "g":
          addFlag(flags, "global");
          break;
        case "i":
          addFlag(flags, "ignoreCase");
          break;
        case "m":
          addFlag(flags, "multiLine");
          break;
        case "u":
          addFlag(flags, "unicode");
          break;
        case "y":
          addFlag(flags, "sticky");
          break;
      }
    }

    if (this.idx !== this.input.length) {
      throw Error("Redundant input: " + this.input.substring(this.idx));
    }
    return {
      type: "Pattern",
      flags: flags,
      value: value,
      loc: this.loc(0),
    };
  }

  protected disjunction(): Disjunction {
    const alts = [];
    const begin = this.idx;

    alts.push(this.alternative());

    while (this.peekChar() === "|") {
      this.consumeChar("|");
      alts.push(this.alternative());
    }

    return { type: "Disjunction", value: alts, loc: this.loc(begin) };
  }

  protected alternative(): Alternative {
    const terms = [];
    const begin = this.idx;

    while (this.isTerm()) {
      terms.push(this.term());
    }

    return { type: "Alternative", value: terms, loc: this.loc(begin) };
  }

  protected term(): Term {
    if (this.isAssertion()) {
      return this.assertion();
    } else {
      return this.atom();
    }
  }

  protected assertion(): Assertion {
    const begin = this.idx;
    switch (this.popChar()) {
      case "^":
        return {
          type: "StartAnchor",
          loc: this.loc(begin),
        };
      case "$":
        return { type: "EndAnchor", loc: this.loc(begin) };
      // '\b' or '\B'
      case "\\":
        switch (this.popChar()) {
          case "b":
            return {
              type: "WordBoundary",
              loc: this.loc(begin),
            };
          case "B":
            return {
              type: "NonWordBoundary",
              loc: this.loc(begin),
            };
        }
        // istanbul ignore next
        throw Error("Invalid Assertion Escape");
      // '(?=' or '(?!'
      case "(":
        this.consumeChar("?");

        let type: "Lookahead" | "NegativeLookahead" | undefined;
        switch (this.popChar()) {
          case "=":
            type = "Lookahead";
            break;
          case "!":
            type = "NegativeLookahead";
            break;
        }
        ASSERT_EXISTS(type);

        const disjunction = this.disjunction();

        this.consumeChar(")");

        return {
          type: type!,
          value: disjunction,
          loc: this.loc(begin),
        };
    }
    // istanbul ignore next
    return ASSERT_NEVER_REACH_HERE();
  }

  protected quantifier(
    isBacktracking: boolean = false,
  ): Quantifier | undefined {
    let range: Partial<Quantifier> | undefined = undefined;
    const begin = this.idx;
    switch (this.popChar()) {
      case "*":
        range = {
          atLeast: 0,
          atMost: Infinity,
        };
        break;
      case "+":
        range = {
          atLeast: 1,
          atMost: Infinity,
        };
        break;
      case "?":
        range = {
          atLeast: 0,
          atMost: 1,
        };
        break;
      case "{":
        const atLeast = this.integerIncludingZero();
        switch (this.popChar()) {
          case "}":
            range = {
              atLeast: atLeast,
              atMost: atLeast,
            };
            break;
          case ",":
            let atMost;
            if (this.isDigit()) {
              atMost = this.integerIncludingZero();
              range = {
                atLeast: atLeast,
                atMost: atMost,
              };
            } else {
              range = {
                atLeast: atLeast,
                atMost: Infinity,
              };
            }
            this.consumeChar("}");
            break;
        }
        // throwing exceptions from "ASSERT_EXISTS" during backtracking
        // causes severe performance degradations
        if (isBacktracking === true && range === undefined) {
          return undefined;
        }
        ASSERT_EXISTS(range);
        break;
    }

    // throwing exceptions from "ASSERT_EXISTS" during backtracking
    // causes severe performance degradations
    if (isBacktracking === true && range === undefined) {
      return undefined;
    }

    // istanbul ignore else
    if (ASSERT_EXISTS(range)) {
      if (this.peekChar(0) === "?") {
        this.consumeChar("?");
        range.greedy = false;
      } else {
        range.greedy = true;
      }

      range.type = "Quantifier";
      range.loc = this.loc(begin);
      return range as Quantifier;
    }
  }

  protected atom(): Atom {
    let atom: Omit<Atom, "loc" | "type"> | undefined;
    const begin = this.idx;
    switch (this.peekChar()) {
      case ".":
        atom = this.dotAll();
        break;
      case "\\":
        atom = this.atomEscape();
        break;
      case "[":
        atom = this.characterClass();
        break;
      case "(":
        atom = this.group();
        break;
    }

    if (atom === undefined && this.isPatternCharacter()) {
      atom = this.patternCharacter();
    }

    // istanbul ignore else
    if (ASSERT_EXISTS<Atom>(atom)) {
      atom.loc = this.loc(begin);

      if (this.isQuantifier()) {
        atom.quantifier = this.quantifier();
      }

      return atom;
    }

    // istanbul ignore next
    return ASSERT_NEVER_REACH_HERE();
  }

  protected dotAll(): Omit<Set, "loc"> {
    this.consumeChar(".");
    return {
      type: "Set",
      complement: true,
      value: [cc("\n"), cc("\r"), cc("\u2028"), cc("\u2029")],
    };
  }

  protected atomEscape(): Omit<GroupBackReference | Set | Character, "loc"> {
    this.consumeChar("\\");

    switch (this.peekChar()) {
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        return this.decimalEscapeAtom();
      case "d":
      case "D":
      case "s":
      case "S":
      case "w":
      case "W":
        return this.characterClassEscape();
      case "f":
      case "n":
      case "r":
      case "t":
      case "v":
        return this.controlEscapeAtom();
      case "c":
        return this.controlLetterEscapeAtom();
      case "0":
        return this.nulCharacterAtom();
      case "x":
        return this.hexEscapeSequenceAtom();
      case "u":
        return this.regExpUnicodeEscapeSequenceAtom();
      default:
        return this.identityEscapeAtom();
    }
  }

  protected decimalEscapeAtom(): Omit<GroupBackReference, "loc"> {
    const value = this.positiveInteger();

    return { type: "GroupBackReference", value: value };
  }

  protected characterClassEscape(): Omit<Set, "loc"> {
    let set: (number | Range)[] | undefined;
    let complement = false;
    switch (this.popChar()) {
      case "d":
        set = digitsCharCodes;
        break;
      case "D":
        set = digitsCharCodes;
        complement = true;
        break;
      case "s":
        set = whitespaceCodes;
        break;
      case "S":
        set = whitespaceCodes;
        complement = true;
        break;
      case "w":
        set = wordCharCodes;
        break;
      case "W":
        set = wordCharCodes;
        complement = true;
        break;
    }

    // istanbul ignore else
    if (ASSERT_EXISTS(set)) {
      return { type: "Set", value: set, complement: complement };
    }
    // istanbul ignore next
    return ASSERT_NEVER_REACH_HERE();
  }

  protected controlEscapeAtom(): Omit<Character, "loc"> {
    let escapeCode;
    switch (this.popChar()) {
      case "f":
        escapeCode = cc("\f");
        break;
      case "n":
        escapeCode = cc("\n");
        break;
      case "r":
        escapeCode = cc("\r");
        break;
      case "t":
        escapeCode = cc("\t");
        break;
      case "v":
        escapeCode = cc("\v");
        break;
    }

    // istanbul ignore else
    if (ASSERT_EXISTS(escapeCode)) {
      return { type: "Character", value: escapeCode };
    }
    // istanbul ignore next
    return ASSERT_NEVER_REACH_HERE();
  }

  protected controlLetterEscapeAtom(): Omit<Character, "loc"> {
    this.consumeChar("c");
    const letter = this.popChar();
    if (/[a-zA-Z]/.test(letter) === false) {
      throw Error("Invalid ");
    }

    const letterCode = letter.toUpperCase().charCodeAt(0) - 64;
    return { type: "Character", value: letterCode };
  }

  protected nulCharacterAtom(): Omit<Character, "loc"> {
    // TODO implement '[lookahead ∉ DecimalDigit]'
    // TODO: for the deprecated octal escape sequence
    this.consumeChar("0");
    return { type: "Character", value: cc("\0") };
  }

  protected hexEscapeSequenceAtom(): Omit<Character, "loc"> {
    this.consumeChar("x");
    return this.parseHexDigits(2);
  }

  protected regExpUnicodeEscapeSequenceAtom(): Omit<Character, "loc"> {
    this.consumeChar("u");
    return this.parseHexDigits(4);
  }

  protected identityEscapeAtom(): Omit<Character, "loc"> {
    // TODO: implement "SourceCharacter but not UnicodeIDContinue"
    // // http://unicode.org/reports/tr31/#Specific_Character_Adjustments
    const escapedChar = this.popChar();
    return { type: "Character", value: cc(escapedChar) };
  }

  protected classPatternCharacterAtom(): Omit<Character, "loc"> {
    switch (this.peekChar()) {
      // istanbul ignore next
      case "\n":
      // istanbul ignore next
      case "\r":
      // istanbul ignore next
      case "\u2028":
      // istanbul ignore next
      case "\u2029":
      // istanbul ignore next
      case "\\":
      // istanbul ignore next
      case "]":
        throw Error("TBD");
      default:
        const nextChar = this.popChar();
        return { type: "Character", value: cc(nextChar) };
    }
  }

  protected characterClass(): Omit<Set, "loc"> {
    const set: (number | Range)[] = [];
    let complement = false;
    this.consumeChar("[");
    if (this.peekChar(0) === "^") {
      this.consumeChar("^");
      complement = true;
    }

    while (this.isClassAtom()) {
      const from = this.classAtom();
      const isFromSingleChar = from.type === "Character";
      if (isCharacter(from) && this.isRangeDash()) {
        this.consumeChar("-");
        const to = this.classAtom();
        const isToSingleChar = to.type === "Character";

        // a range can only be used when both sides are single characters
        if (isCharacter(to)) {
          if (to.value < from.value) {
            throw Error("Range out of order in character class");
          }
          set.push({ from: from.value, to: to.value });
        } else {
          // literal dash
          insertToSet(from.value, set);
          set.push(cc("-"));
          insertToSet(to.value, set);
        }
      } else {
        insertToSet(from.value, set);
      }
    }

    this.consumeChar("]");

    return { type: "Set", complement: complement, value: set };
  }

  protected classAtom(): Omit<Character | Set, "loc"> {
    switch (this.peekChar()) {
      // istanbul ignore next
      case "]":
      // istanbul ignore next
      case "\n":
      // istanbul ignore next
      case "\r":
      // istanbul ignore next
      case "\u2028":
      // istanbul ignore next
      case "\u2029":
        throw Error("TBD");
      case "\\":
        return this.classEscape();
      default:
        return this.classPatternCharacterAtom();
    }
  }

  protected classEscape(): Omit<Character | Set, "loc"> {
    this.consumeChar("\\");
    switch (this.peekChar()) {
      // Matches a backspace.
      // (Not to be confused with \b word boundary outside characterClass)
      case "b":
        this.consumeChar("b");
        return { type: "Character", value: cc("\u0008") };
      case "d":
      case "D":
      case "s":
      case "S":
      case "w":
      case "W":
        return this.characterClassEscape();
      case "f":
      case "n":
      case "r":
      case "t":
      case "v":
        return this.controlEscapeAtom();
      case "c":
        return this.controlLetterEscapeAtom();
      case "0":
        return this.nulCharacterAtom();
      case "x":
        return this.hexEscapeSequenceAtom();
      case "u":
        return this.regExpUnicodeEscapeSequenceAtom();
      default:
        return this.identityEscapeAtom();
    }
  }

  protected group(): Omit<Group, "loc"> {
    let capturing = true;
    this.consumeChar("(");
    switch (this.peekChar(0)) {
      case "?":
        this.consumeChar("?");
        this.consumeChar(":");
        capturing = false;
        break;
      default:
        this.groupIdx++;
        break;
    }
    const value = this.disjunction();
    this.consumeChar(")");

    const groupAst: Omit<Group, "loc"> = {
      type: "Group",
      capturing: capturing,
      value: value,
    };

    if (capturing) {
      groupAst["idx"] = this.groupIdx;
    }

    return groupAst;
  }

  protected positiveInteger(): number {
    let number = this.popChar();

    // istanbul ignore next - can't ever get here due to previous lookahead checks
    // still implementing this error checking in case this ever changes.
    if (decimalPatternNoZero.test(number) === false) {
      throw Error("Expecting a positive integer");
    }

    while (decimalPattern.test(this.peekChar(0))) {
      number += this.popChar();
    }

    return parseInt(number, 10);
  }

  protected integerIncludingZero(): number {
    let number = this.popChar();
    if (decimalPattern.test(number) === false) {
      throw Error("Expecting an integer");
    }

    while (decimalPattern.test(this.peekChar(0))) {
      number += this.popChar();
    }

    return parseInt(number, 10);
  }

  protected patternCharacter(): Omit<Character, "loc"> {
    const nextChar = this.popChar();
    switch (nextChar) {
      // istanbul ignore next
      case "\n":
      // istanbul ignore next
      case "\r":
      // istanbul ignore next
      case "\u2028":
      // istanbul ignore next
      case "\u2029":
      // istanbul ignore next
      case "^":
      // istanbul ignore next
      case "$":
      // istanbul ignore next
      case "\\":
      // istanbul ignore next
      case ".":
      // istanbul ignore next
      case "*":
      // istanbul ignore next
      case "+":
      // istanbul ignore next
      case "?":
      // istanbul ignore next
      case "(":
      // istanbul ignore next
      case ")":
      // istanbul ignore next
      case "[":
      // istanbul ignore next
      case "|":
        // istanbul ignore next
        throw Error("TBD");
      default:
        return { type: "Character", value: cc(nextChar) };
    }
  }
  protected isRegExpFlag(): boolean {
    switch (this.peekChar(0)) {
      case "g":
      case "i":
      case "m":
      case "u":
      case "y":
        return true;
      default:
        return false;
    }
  }

  protected isRangeDash(): boolean {
    return this.peekChar() === "-" && this.isClassAtom(1);
  }

  protected isDigit(): boolean {
    return decimalPattern.test(this.peekChar(0));
  }

  protected isClassAtom(howMuch = 0): boolean {
    switch (this.peekChar(howMuch)) {
      case "]":
      case "\n":
      case "\r":
      case "\u2028":
      case "\u2029":
        return false;
      default:
        return true;
    }
  }

  protected isTerm() {
    return this.isAtom() || this.isAssertion();
  }

  protected isAtom(): boolean {
    if (this.isPatternCharacter()) {
      return true;
    }

    switch (this.peekChar(0)) {
      case ".":
      case "\\": // atomEscape
      case "[": // characterClass
      // TODO: isAtom must be called before isAssertion - disambiguate
      case "(": // group
        return true;
      default:
        return false;
    }
  }

  protected isAssertion(): boolean {
    switch (this.peekChar(0)) {
      case "^":
      case "$":
        return true;
      // '\b' or '\B'
      case "\\":
        switch (this.peekChar(1)) {
          case "b":
          case "B":
            return true;
          default:
            return false;
        }
      // '(?=' or '(?!'
      case "(":
        return (
          this.peekChar(1) === "?" &&
          (this.peekChar(2) === "=" || this.peekChar(2) === "!")
        );
      default:
        return false;
    }
  }

  protected isQuantifier(): boolean {
    const prevState = this.saveState();
    try {
      return this.quantifier(true) !== undefined;
    } catch (e) {
      return false;
    } finally {
      this.restoreState(prevState);
    }
  }

  protected isPatternCharacter(): boolean {
    switch (this.peekChar()) {
      case "^":
      case "$":
      case "\\":
      case ".":
      case "*":
      case "+":
      case "?":
      case "(":
      case ")":
      case "[":
      case "|":
      case "/":
      case "\n":
      case "\r":
      case "\u2028":
      case "\u2029":
        return false;
      default:
        return true;
    }
  }

  protected parseHexDigits(howMany: number): Omit<Character, "loc"> {
    let hexString = "";
    for (let i = 0; i < howMany; i++) {
      const hexChar = this.popChar();
      if (hexDigitPattern.test(hexChar) === false) {
        throw Error("Expecting a HexDecimal digits");
      }
      hexString += hexChar;
    }
    const charCode = parseInt(hexString, 16);
    return { type: "Character", value: charCode };
  }

  protected peekChar(howMuch = 0): string {
    return this.input[this.idx + howMuch];
  }

  protected popChar(): string {
    const nextChar = this.peekChar(0);
    this.consumeChar(undefined);
    return nextChar;
  }

  protected consumeChar(char: string | undefined): void {
    if (char !== undefined && this.input[this.idx] !== char) {
      throw Error(
        "Expected: '" +
          char +
          "' but found: '" +
          this.input[this.idx] +
          "' at offset: " +
          this.idx,
      );
    }

    if (this.idx >= this.input.length) {
      throw Error("Unexpected end of input");
    }
    this.idx++;
  }

  protected loc(begin: number): Location {
    return { begin: begin, end: this.idx };
  }
}
