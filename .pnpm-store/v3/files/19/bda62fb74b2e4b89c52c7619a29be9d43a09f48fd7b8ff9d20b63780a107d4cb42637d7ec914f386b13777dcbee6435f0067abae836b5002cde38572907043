/**
 * Helper common type definitions
 * Particularly useful when expending the public API
 * to include additional **internal** properties.
 */
import { IParserConfig, ParserMethod } from "@chevrotain/types";

export type ParserMethodInternal<ARGS extends unknown[], R> = ParserMethod<
  ARGS,
  R
> & {
  ruleName: string;
  originalGrammarAction: Function;
};

export type IParserConfigInternal = IParserConfig & { outputCst: boolean };
