import { ErrorHandler } from "./error_handler.js";
import { LexerAdapter } from "./lexer_adapter.js";
import { LooksAhead } from "./looksahead.js";
import { RecognizerApi } from "./recognizer_api.js";
import { RecognizerEngine } from "./recognizer_engine.js";
import { Recoverable } from "./recoverable.js";
import { TreeBuilder } from "./tree_builder.js";
import {
  CstParser as CstParserConstructorImpel,
  EmbeddedActionsParser as EmbeddedActionsParserConstructorImpl,
  Parser as ParserConstructorImpel,
} from "../parser.js";
import * as defs from "@chevrotain/types";
import { ContentAssist } from "./context_assist.js";
import { GastRecorder } from "./gast_recorder.js";
import { PerformanceTracer } from "./perf_tracer.js";

/**
 * This Type combines all the Parser traits.
 * It is used in all traits in the "this type assertion"
 * - https://github.com/Microsoft/TypeScript/wiki/What%27s-new-in-TypeScript#specifying-the-type-of-this-for-functions
 * This enables strong Type Checks inside trait methods that invoke methods from other traits.
 * This pattern is very similar to "self types" in Scala.
 * - https://docs.scala-lang.org/tour/self-types.html
 */
export type MixedInParser = ParserConstructorImpel &
  ErrorHandler &
  LexerAdapter &
  LooksAhead &
  RecognizerApi &
  RecognizerEngine &
  Recoverable &
  TreeBuilder &
  ContentAssist &
  GastRecorder &
  PerformanceTracer;

interface MixedInCstParserConstructor {
  new (
    tokenVocabulary: defs.TokenVocabulary,
    config?: defs.IParserConfig,
  ): defs.CstParser;
}

export const CstParser: MixedInCstParserConstructor = <any>(
  CstParserConstructorImpel
);

interface MixedInEmbeddedActionsParserConstructor {
  new (
    tokenVocabulary: defs.TokenVocabulary,
    config?: defs.IParserConfig,
  ): defs.EmbeddedActionsParser;
}

export const EmbeddedActionsParser: MixedInEmbeddedActionsParserConstructor = <
  any
>EmbeddedActionsParserConstructorImpl;
