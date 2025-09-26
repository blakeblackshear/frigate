import {
  IParserConfig,
  IParserErrorMessageProvider,
  IRecognitionException,
} from "@chevrotain/types";
import {
  EarlyExitException,
  isRecognitionException,
  NoViableAltException,
} from "../../exceptions_public.js";
import { clone, has } from "lodash-es";
import {
  getLookaheadPathsForOptionalProd,
  getLookaheadPathsForOr,
  PROD_TYPE,
} from "../../grammar/lookahead.js";
import { MixedInParser } from "./parser_traits.js";
import { DEFAULT_PARSER_CONFIG } from "../parser.js";

/**
 * Trait responsible for runtime parsing errors.
 */
export class ErrorHandler {
  _errors: IRecognitionException[];
  errorMessageProvider: IParserErrorMessageProvider;

  initErrorHandler(config: IParserConfig) {
    this._errors = [];
    this.errorMessageProvider = has(config, "errorMessageProvider")
      ? (config.errorMessageProvider as IParserErrorMessageProvider) // assumes end user provides the correct config value/type
      : DEFAULT_PARSER_CONFIG.errorMessageProvider;
  }

  SAVE_ERROR(
    this: MixedInParser,
    error: IRecognitionException,
  ): IRecognitionException {
    if (isRecognitionException(error)) {
      error.context = {
        ruleStack: this.getHumanReadableRuleStack(),
        ruleOccurrenceStack: clone(this.RULE_OCCURRENCE_STACK),
      };
      this._errors.push(error);
      return error;
    } else {
      throw Error(
        "Trying to save an Error which is not a RecognitionException",
      );
    }
  }

  get errors(): IRecognitionException[] {
    return clone(this._errors);
  }

  set errors(newErrors: IRecognitionException[]) {
    this._errors = newErrors;
  }

  // TODO: consider caching the error message computed information
  raiseEarlyExitException(
    this: MixedInParser,
    occurrence: number,
    prodType: PROD_TYPE,
    userDefinedErrMsg: string | undefined,
  ): never {
    const ruleName = this.getCurrRuleFullName();
    const ruleGrammar = this.getGAstProductions()[ruleName];
    const lookAheadPathsPerAlternative = getLookaheadPathsForOptionalProd(
      occurrence,
      ruleGrammar,
      prodType,
      this.maxLookahead,
    );
    const insideProdPaths = lookAheadPathsPerAlternative[0];
    const actualTokens = [];
    for (let i = 1; i <= this.maxLookahead; i++) {
      actualTokens.push(this.LA(i));
    }
    const msg = this.errorMessageProvider.buildEarlyExitMessage({
      expectedIterationPaths: insideProdPaths,
      actual: actualTokens,
      previous: this.LA(0),
      customUserDescription: userDefinedErrMsg,
      ruleName: ruleName,
    });

    throw this.SAVE_ERROR(new EarlyExitException(msg, this.LA(1), this.LA(0)));
  }

  // TODO: consider caching the error message computed information
  raiseNoAltException(
    this: MixedInParser,
    occurrence: number,
    errMsgTypes: string | undefined,
  ): never {
    const ruleName = this.getCurrRuleFullName();
    const ruleGrammar = this.getGAstProductions()[ruleName];
    // TODO: getLookaheadPathsForOr can be slow for large enough maxLookahead and certain grammars, consider caching ?
    const lookAheadPathsPerAlternative = getLookaheadPathsForOr(
      occurrence,
      ruleGrammar,
      this.maxLookahead,
    );

    const actualTokens = [];
    for (let i = 1; i <= this.maxLookahead; i++) {
      actualTokens.push(this.LA(i));
    }
    const previousToken = this.LA(0);

    const errMsg = this.errorMessageProvider.buildNoViableAltMessage({
      expectedPathsPerAlt: lookAheadPathsPerAlternative,
      actual: actualTokens,
      previous: previousToken,
      customUserDescription: errMsgTypes,
      ruleName: this.getCurrRuleFullName(),
    });

    throw this.SAVE_ERROR(
      new NoViableAltException(errMsg, this.LA(1), previousToken),
    );
  }
}
