import { ILexerErrorMessageProvider, IToken } from "@chevrotain/types";

export const defaultLexerErrorProvider: ILexerErrorMessageProvider = {
  buildUnableToPopLexerModeMessage(token: IToken): string {
    return `Unable to pop Lexer Mode after encountering Token ->${token.image}<- The Mode Stack is empty`;
  },

  buildUnexpectedCharactersMessage(
    fullText: string,
    startOffset: number,
    length: number,
    line?: number,
    column?: number,
  ): string {
    return (
      `unexpected character: ->${fullText.charAt(
        startOffset,
      )}<- at offset: ${startOffset},` + ` skipped ${length} characters.`
    );
  },
};
