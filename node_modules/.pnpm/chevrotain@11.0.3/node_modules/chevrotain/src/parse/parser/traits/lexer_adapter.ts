import { END_OF_FILE } from "../parser.js";
import { IToken } from "@chevrotain/types";
import { MixedInParser } from "./parser_traits.js";

/**
 * Trait responsible abstracting over the interaction with Lexer output (Token vector).
 *
 * This could be generalized to support other kinds of lexers, e.g.
 * - Just in Time Lexing / Lexer-Less parsing.
 * - Streaming Lexer.
 */
export class LexerAdapter {
  tokVector: IToken[];
  tokVectorLength: number;
  currIdx: number;

  initLexerAdapter() {
    this.tokVector = [];
    this.tokVectorLength = 0;
    this.currIdx = -1;
  }

  set input(newInput: IToken[]) {
    // @ts-ignore - `this parameter` not supported in setters/getters
    //   - https://www.typescriptlang.org/docs/handbook/functions.html#this-parameters
    if (this.selfAnalysisDone !== true) {
      throw Error(
        `Missing <performSelfAnalysis> invocation at the end of the Parser's constructor.`,
      );
    }
    // @ts-ignore - `this parameter` not supported in setters/getters
    //   - https://www.typescriptlang.org/docs/handbook/functions.html#this-parameters
    this.reset();
    this.tokVector = newInput;
    this.tokVectorLength = newInput.length;
  }

  get input(): IToken[] {
    return this.tokVector;
  }

  // skips a token and returns the next token
  SKIP_TOKEN(this: MixedInParser): IToken {
    if (this.currIdx <= this.tokVector.length - 2) {
      this.consumeToken();
      return this.LA(1);
    } else {
      return END_OF_FILE;
    }
  }

  // Lexer (accessing Token vector) related methods which can be overridden to implement lazy lexers
  // or lexers dependent on parser context.
  LA(this: MixedInParser, howMuch: number): IToken {
    const soughtIdx = this.currIdx + howMuch;
    if (soughtIdx < 0 || this.tokVectorLength <= soughtIdx) {
      return END_OF_FILE;
    } else {
      return this.tokVector[soughtIdx];
    }
  }

  consumeToken(this: MixedInParser) {
    this.currIdx++;
  }

  exportLexerState(this: MixedInParser): number {
    return this.currIdx;
  }

  importLexerState(this: MixedInParser, newState: number) {
    this.currIdx = newState;
  }

  resetLexerState(this: MixedInParser): void {
    this.currIdx = -1;
  }

  moveToTerminatedState(this: MixedInParser): void {
    this.currIdx = this.tokVector.length - 1;
  }

  getLexerPosition(this: MixedInParser): number {
    return this.exportLexerState();
  }
}
