import {
  AtLeastOneSepMethodOpts,
  ConsumeMethodOpts,
  DSLMethodOpts,
  DSLMethodOptsWithErr,
  GrammarAction,
  IOrAlt,
  IParserConfig,
  IRuleConfig,
  IToken,
  ManySepMethodOpts,
  OrMethodOpts,
  ParserMethod,
  SubruleMethodOpts,
  TokenType,
  TokenTypeDictionary,
  TokenVocabulary,
} from "@chevrotain/types";
import {
  clone,
  every,
  flatten,
  has,
  isArray,
  isEmpty,
  isObject,
  reduce,
  uniq,
  values,
} from "lodash-es";
import {
  AT_LEAST_ONE_IDX,
  AT_LEAST_ONE_SEP_IDX,
  BITS_FOR_METHOD_TYPE,
  BITS_FOR_OCCURRENCE_IDX,
  MANY_IDX,
  MANY_SEP_IDX,
  OPTION_IDX,
  OR_IDX,
} from "../../grammar/keys.js";
import {
  isRecognitionException,
  MismatchedTokenException,
  NotAllInputParsedException,
} from "../../exceptions_public.js";
import { PROD_TYPE } from "../../grammar/lookahead.js";
import {
  AbstractNextTerminalAfterProductionWalker,
  NextTerminalAfterAtLeastOneSepWalker,
  NextTerminalAfterAtLeastOneWalker,
  NextTerminalAfterManySepWalker,
  NextTerminalAfterManyWalker,
} from "../../grammar/interpreter.js";
import { DEFAULT_RULE_CONFIG, IParserState, TokenMatcher } from "../parser.js";
import { IN_RULE_RECOVERY_EXCEPTION } from "./recoverable.js";
import { EOF } from "../../../scan/tokens_public.js";
import { MixedInParser } from "./parser_traits.js";
import {
  augmentTokenTypes,
  isTokenType,
  tokenStructuredMatcher,
  tokenStructuredMatcherNoCategories,
} from "../../../scan/tokens.js";
import { Rule } from "@chevrotain/gast";
import { ParserMethodInternal } from "../types.js";

/**
 * This trait is responsible for the runtime parsing engine
 * Used by the official API (recognizer_api.ts)
 */
export class RecognizerEngine {
  isBackTrackingStack: boolean[];
  className: string;
  RULE_STACK: number[];
  RULE_OCCURRENCE_STACK: number[];
  definedRulesNames: string[];
  tokensMap: { [fqn: string]: TokenType };
  gastProductionsCache: Record<string, Rule>;
  shortRuleNameToFull: Record<string, string>;
  fullRuleNameToShort: Record<string, number>;
  // The shortName Index must be coded "after" the first 8bits to enable building unique lookahead keys
  ruleShortNameIdx: number;
  tokenMatcher: TokenMatcher;
  subruleIdx: number;

  initRecognizerEngine(
    tokenVocabulary: TokenVocabulary,
    config: IParserConfig,
  ) {
    this.className = this.constructor.name;
    // TODO: would using an ES6 Map or plain object be faster (CST building scenario)
    this.shortRuleNameToFull = {};
    this.fullRuleNameToShort = {};
    this.ruleShortNameIdx = 256;
    this.tokenMatcher = tokenStructuredMatcherNoCategories;
    this.subruleIdx = 0;

    this.definedRulesNames = [];
    this.tokensMap = {};
    this.isBackTrackingStack = [];
    this.RULE_STACK = [];
    this.RULE_OCCURRENCE_STACK = [];
    this.gastProductionsCache = {};

    if (has(config, "serializedGrammar")) {
      throw Error(
        "The Parser's configuration can no longer contain a <serializedGrammar> property.\n" +
          "\tSee: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_6-0-0\n" +
          "\tFor Further details.",
      );
    }

    if (isArray(tokenVocabulary)) {
      // This only checks for Token vocabularies provided as arrays.
      // That is good enough because the main objective is to detect users of pre-V4.0 APIs
      // rather than all edge cases of empty Token vocabularies.
      if (isEmpty(tokenVocabulary as any[])) {
        throw Error(
          "A Token Vocabulary cannot be empty.\n" +
            "\tNote that the first argument for the parser constructor\n" +
            "\tis no longer a Token vector (since v4.0).",
        );
      }

      if (typeof (tokenVocabulary as any[])[0].startOffset === "number") {
        throw Error(
          "The Parser constructor no longer accepts a token vector as the first argument.\n" +
            "\tSee: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_4-0-0\n" +
            "\tFor Further details.",
        );
      }
    }

    if (isArray(tokenVocabulary)) {
      this.tokensMap = reduce(
        tokenVocabulary,
        (acc, tokType: TokenType) => {
          acc[tokType.name] = tokType;
          return acc;
        },
        {} as { [tokenName: string]: TokenType },
      );
    } else if (
      has(tokenVocabulary, "modes") &&
      every(flatten(values((<any>tokenVocabulary).modes)), isTokenType)
    ) {
      const allTokenTypes = flatten(values((<any>tokenVocabulary).modes));
      const uniqueTokens = uniq(allTokenTypes);
      this.tokensMap = <any>reduce(
        uniqueTokens,
        (acc, tokType: TokenType) => {
          acc[tokType.name] = tokType;
          return acc;
        },
        {} as { [tokenName: string]: TokenType },
      );
    } else if (isObject(tokenVocabulary)) {
      this.tokensMap = clone(tokenVocabulary as TokenTypeDictionary);
    } else {
      throw new Error(
        "<tokensDictionary> argument must be An Array of Token constructors," +
          " A dictionary of Token constructors or an IMultiModeLexerDefinition",
      );
    }

    // always add EOF to the tokenNames -> constructors map. it is useful to assure all the input has been
    // parsed with a clear error message ("expecting EOF but found ...")
    this.tokensMap["EOF"] = EOF;

    const allTokenTypes = has(tokenVocabulary, "modes")
      ? flatten(values((<any>tokenVocabulary).modes))
      : values(tokenVocabulary);
    const noTokenCategoriesUsed = every(allTokenTypes, (tokenConstructor) =>
      isEmpty(tokenConstructor.categoryMatches),
    );

    this.tokenMatcher = noTokenCategoriesUsed
      ? tokenStructuredMatcherNoCategories
      : tokenStructuredMatcher;

    // Because ES2015+ syntax should be supported for creating Token classes
    // We cannot assume that the Token classes were created using the "extendToken" utilities
    // Therefore we must augment the Token classes both on Lexer initialization and on Parser initialization
    augmentTokenTypes(values(this.tokensMap));
  }

  defineRule<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleName: string,
    impl: (...args: ARGS) => R,
    config: IRuleConfig<R>,
  ): ParserMethodInternal<ARGS, R> {
    if (this.selfAnalysisDone) {
      throw Error(
        `Grammar rule <${ruleName}> may not be defined after the 'performSelfAnalysis' method has been called'\n` +
          `Make sure that all grammar rule definitions are done before 'performSelfAnalysis' is called.`,
      );
    }
    const resyncEnabled: boolean = has(config, "resyncEnabled")
      ? (config.resyncEnabled as boolean) // assumes end user provides the correct config value/type
      : DEFAULT_RULE_CONFIG.resyncEnabled;
    const recoveryValueFunc = has(config, "recoveryValueFunc")
      ? (config.recoveryValueFunc as () => R) // assumes end user provides the correct config value/type
      : DEFAULT_RULE_CONFIG.recoveryValueFunc;

    // performance optimization: Use small integers as keys for the longer human readable "full" rule names.
    // this greatly improves Map access time (as much as 8% for some performance benchmarks).
    const shortName =
      this.ruleShortNameIdx << (BITS_FOR_METHOD_TYPE + BITS_FOR_OCCURRENCE_IDX);

    this.ruleShortNameIdx++;
    this.shortRuleNameToFull[shortName] = ruleName;
    this.fullRuleNameToShort[ruleName] = shortName;

    let invokeRuleWithTry: ParserMethod<ARGS, R>;

    // Micro optimization, only check the condition **once** on rule definition
    // instead of **every single** rule invocation.
    if (this.outputCst === true) {
      invokeRuleWithTry = function invokeRuleWithTry(
        this: MixedInParser,
        ...args: ARGS
      ): R {
        try {
          this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
          impl.apply(this, args);
          const cst = this.CST_STACK[this.CST_STACK.length - 1];
          this.cstPostRule(cst);
          return cst as unknown as R;
        } catch (e) {
          return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc) as R;
        } finally {
          this.ruleFinallyStateUpdate();
        }
      };
    } else {
      invokeRuleWithTry = function invokeRuleWithTryCst(
        this: MixedInParser,
        ...args: ARGS
      ): R {
        try {
          this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
          return impl.apply(this, args);
        } catch (e) {
          return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc) as R;
        } finally {
          this.ruleFinallyStateUpdate();
        }
      };
    }

    const wrappedGrammarRule: ParserMethodInternal<ARGS, R> = Object.assign(
      invokeRuleWithTry as any,
      { ruleName, originalGrammarAction: impl },
    );

    return wrappedGrammarRule;
  }

  invokeRuleCatch(
    this: MixedInParser,
    e: Error,
    resyncEnabledConfig: boolean,
    recoveryValueFunc: Function,
  ): unknown {
    const isFirstInvokedRule = this.RULE_STACK.length === 1;
    // note the reSync is always enabled for the first rule invocation, because we must always be able to
    // reSync with EOF and just output some INVALID ParseTree
    // during backtracking reSync recovery is disabled, otherwise we can't be certain the backtracking
    // path is really the most valid one
    const reSyncEnabled =
      resyncEnabledConfig && !this.isBackTracking() && this.recoveryEnabled;

    if (isRecognitionException(e)) {
      const recogError: any = e;
      if (reSyncEnabled) {
        const reSyncTokType = this.findReSyncTokenType();
        if (this.isInCurrentRuleReSyncSet(reSyncTokType)) {
          recogError.resyncedTokens = this.reSyncTo(reSyncTokType);
          if (this.outputCst) {
            const partialCstResult: any =
              this.CST_STACK[this.CST_STACK.length - 1];
            partialCstResult.recoveredNode = true;
            return partialCstResult;
          } else {
            return recoveryValueFunc(e);
          }
        } else {
          if (this.outputCst) {
            const partialCstResult: any =
              this.CST_STACK[this.CST_STACK.length - 1];
            partialCstResult.recoveredNode = true;
            recogError.partialCstResult = partialCstResult;
          }
          // to be handled Further up the call stack
          throw recogError;
        }
      } else if (isFirstInvokedRule) {
        // otherwise a Redundant input error will be created as well and we cannot guarantee that this is indeed the case
        this.moveToTerminatedState();
        // the parser should never throw one of its own errors outside its flow.
        // even if error recovery is disabled
        return recoveryValueFunc(e);
      } else {
        // to be recovered Further up the call stack
        throw recogError;
      }
    } else {
      // some other Error type which we don't know how to handle (for example a built in JavaScript Error)
      throw e;
    }
  }

  // Implementation of parsing DSL
  optionInternal<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
    occurrence: number,
  ): OUT | undefined {
    const key = this.getKeyForAutomaticLookahead(OPTION_IDX, occurrence);
    return this.optionInternalLogic(actionORMethodDef, occurrence, key);
  }

  optionInternalLogic<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
    occurrence: number,
    key: number,
  ): OUT | undefined {
    let lookAheadFunc = this.getLaFuncFromCache(key);
    let action: GrammarAction<OUT>;
    if (typeof actionORMethodDef !== "function") {
      action = actionORMethodDef.DEF;
      const predicate = actionORMethodDef.GATE;
      // predicate present
      if (predicate !== undefined) {
        const orgLookaheadFunction = lookAheadFunc;
        lookAheadFunc = () => {
          return predicate.call(this) && orgLookaheadFunction.call(this);
        };
      }
    } else {
      action = actionORMethodDef;
    }

    if (lookAheadFunc.call(this) === true) {
      return action.call(this);
    }
    return undefined;
  }

  atLeastOneInternal<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    const laKey = this.getKeyForAutomaticLookahead(
      AT_LEAST_ONE_IDX,
      prodOccurrence,
    );
    return this.atLeastOneInternalLogic(
      prodOccurrence,
      actionORMethodDef,
      laKey,
    );
  }

  atLeastOneInternalLogic<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
    key: number,
  ): void {
    let lookAheadFunc = this.getLaFuncFromCache(key);
    let action;
    if (typeof actionORMethodDef !== "function") {
      action = actionORMethodDef.DEF;
      const predicate = actionORMethodDef.GATE;
      // predicate present
      if (predicate !== undefined) {
        const orgLookaheadFunction = lookAheadFunc;
        lookAheadFunc = () => {
          return predicate.call(this) && orgLookaheadFunction.call(this);
        };
      }
    } else {
      action = actionORMethodDef;
    }

    if ((<Function>lookAheadFunc).call(this) === true) {
      let notStuck = this.doSingleRepetition(action);
      while (
        (<Function>lookAheadFunc).call(this) === true &&
        notStuck === true
      ) {
        notStuck = this.doSingleRepetition(action);
      }
    } else {
      throw this.raiseEarlyExitException(
        prodOccurrence,
        PROD_TYPE.REPETITION_MANDATORY,
        (<DSLMethodOptsWithErr<OUT>>actionORMethodDef).ERR_MSG,
      );
    }

    // note that while it may seem that this can cause an error because by using a recursive call to
    // AT_LEAST_ONE we change the grammar to AT_LEAST_TWO, AT_LEAST_THREE ... , the possible recursive call
    // from the tryInRepetitionRecovery(...) will only happen IFF there really are TWO/THREE/.... items.

    // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
    this.attemptInRepetitionRecovery(
      this.atLeastOneInternal,
      [prodOccurrence, actionORMethodDef],
      <any>lookAheadFunc,
      AT_LEAST_ONE_IDX,
      prodOccurrence,
      NextTerminalAfterAtLeastOneWalker,
    );
  }

  atLeastOneSepFirstInternal<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    const laKey = this.getKeyForAutomaticLookahead(
      AT_LEAST_ONE_SEP_IDX,
      prodOccurrence,
    );
    this.atLeastOneSepFirstInternalLogic(prodOccurrence, options, laKey);
  }

  atLeastOneSepFirstInternalLogic<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    options: AtLeastOneSepMethodOpts<OUT>,
    key: number,
  ): void {
    const action = options.DEF;
    const separator = options.SEP;

    const firstIterationLookaheadFunc = this.getLaFuncFromCache(key);

    // 1st iteration
    if (firstIterationLookaheadFunc.call(this) === true) {
      (<GrammarAction<OUT>>action).call(this);

      //  TODO: Optimization can move this function construction into "attemptInRepetitionRecovery"
      //  because it is only needed in error recovery scenarios.
      const separatorLookAheadFunc = () => {
        return this.tokenMatcher(this.LA(1), separator);
      };

      // 2nd..nth iterations
      while (this.tokenMatcher(this.LA(1), separator) === true) {
        // note that this CONSUME will never enter recovery because
        // the separatorLookAheadFunc checks that the separator really does exist.
        this.CONSUME(separator);
        // No need for checking infinite loop here due to consuming the separator.
        (<GrammarAction<OUT>>action).call(this);
      }

      // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
      this.attemptInRepetitionRecovery(
        this.repetitionSepSecondInternal,
        [
          prodOccurrence,
          separator,
          separatorLookAheadFunc,
          action,
          NextTerminalAfterAtLeastOneSepWalker,
        ],
        separatorLookAheadFunc,
        AT_LEAST_ONE_SEP_IDX,
        prodOccurrence,
        NextTerminalAfterAtLeastOneSepWalker,
      );
    } else {
      throw this.raiseEarlyExitException(
        prodOccurrence,
        PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR,
        options.ERR_MSG,
      );
    }
  }

  manyInternal<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    const laKey = this.getKeyForAutomaticLookahead(MANY_IDX, prodOccurrence);
    return this.manyInternalLogic(prodOccurrence, actionORMethodDef, laKey);
  }

  manyInternalLogic<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
    key: number,
  ) {
    let lookaheadFunction = this.getLaFuncFromCache(key);
    let action;
    if (typeof actionORMethodDef !== "function") {
      action = actionORMethodDef.DEF;
      const predicate = actionORMethodDef.GATE;
      // predicate present
      if (predicate !== undefined) {
        const orgLookaheadFunction = lookaheadFunction;
        lookaheadFunction = () => {
          return predicate.call(this) && orgLookaheadFunction.call(this);
        };
      }
    } else {
      action = actionORMethodDef;
    }

    let notStuck = true;
    while (lookaheadFunction.call(this) === true && notStuck === true) {
      notStuck = this.doSingleRepetition(action);
    }

    // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
    this.attemptInRepetitionRecovery(
      this.manyInternal,
      [prodOccurrence, actionORMethodDef],
      <any>lookaheadFunction,
      MANY_IDX,
      prodOccurrence,
      NextTerminalAfterManyWalker,
      // The notStuck parameter is only relevant when "attemptInRepetitionRecovery"
      // is invoked from manyInternal, in the MANY_SEP case and AT_LEAST_ONE[_SEP]
      // An infinite loop cannot occur as:
      // - Either the lookahead is guaranteed to consume something (Single Token Separator)
      // - AT_LEAST_ONE by definition is guaranteed to consume something (or error out).
      notStuck,
    );
  }

  manySepFirstInternal<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    options: ManySepMethodOpts<OUT>,
  ): void {
    const laKey = this.getKeyForAutomaticLookahead(
      MANY_SEP_IDX,
      prodOccurrence,
    );
    this.manySepFirstInternalLogic(prodOccurrence, options, laKey);
  }

  manySepFirstInternalLogic<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    options: ManySepMethodOpts<OUT>,
    key: number,
  ): void {
    const action = options.DEF;
    const separator = options.SEP;
    const firstIterationLaFunc = this.getLaFuncFromCache(key);

    // 1st iteration
    if (firstIterationLaFunc.call(this) === true) {
      action.call(this);

      const separatorLookAheadFunc = () => {
        return this.tokenMatcher(this.LA(1), separator);
      };
      // 2nd..nth iterations
      while (this.tokenMatcher(this.LA(1), separator) === true) {
        // note that this CONSUME will never enter recovery because
        // the separatorLookAheadFunc checks that the separator really does exist.
        this.CONSUME(separator);
        // No need for checking infinite loop here due to consuming the separator.
        action.call(this);
      }

      // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
      this.attemptInRepetitionRecovery(
        this.repetitionSepSecondInternal,
        [
          prodOccurrence,
          separator,
          separatorLookAheadFunc,
          action,
          NextTerminalAfterManySepWalker,
        ],
        separatorLookAheadFunc,
        MANY_SEP_IDX,
        prodOccurrence,
        NextTerminalAfterManySepWalker,
      );
    }
  }

  repetitionSepSecondInternal<OUT>(
    this: MixedInParser,
    prodOccurrence: number,
    separator: TokenType,
    separatorLookAheadFunc: () => boolean,
    action: GrammarAction<OUT>,
    nextTerminalAfterWalker: typeof AbstractNextTerminalAfterProductionWalker,
  ): void {
    while (separatorLookAheadFunc()) {
      // note that this CONSUME will never enter recovery because
      // the separatorLookAheadFunc checks that the separator really does exist.
      this.CONSUME(separator);
      action.call(this);
    }

    // we can only arrive to this function after an error
    // has occurred (hence the name 'second') so the following
    // IF will always be entered, its possible to remove it...
    // however it is kept to avoid confusion and be consistent.
    // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
    /* istanbul ignore else */
    this.attemptInRepetitionRecovery(
      this.repetitionSepSecondInternal,
      [
        prodOccurrence,
        separator,
        separatorLookAheadFunc,
        action,
        nextTerminalAfterWalker,
      ],
      separatorLookAheadFunc,
      AT_LEAST_ONE_SEP_IDX,
      prodOccurrence,
      nextTerminalAfterWalker,
    );
  }

  doSingleRepetition(this: MixedInParser, action: Function): any {
    const beforeIteration = this.getLexerPosition();
    action.call(this);
    const afterIteration = this.getLexerPosition();

    // This boolean will indicate if this repetition progressed
    // or if we are "stuck" (potential infinite loop in the repetition).
    return afterIteration > beforeIteration;
  }

  orInternal<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
    occurrence: number,
  ): T {
    const laKey = this.getKeyForAutomaticLookahead(OR_IDX, occurrence);
    const alts = isArray(altsOrOpts) ? altsOrOpts : altsOrOpts.DEF;

    const laFunc = this.getLaFuncFromCache(laKey);
    const altIdxToTake = laFunc.call(this, alts);
    if (altIdxToTake !== undefined) {
      const chosenAlternative: any = alts[altIdxToTake];
      return chosenAlternative.ALT.call(this);
    }
    this.raiseNoAltException(
      occurrence,
      (altsOrOpts as OrMethodOpts<unknown>).ERR_MSG,
    );
  }

  ruleFinallyStateUpdate(this: MixedInParser): void {
    this.RULE_STACK.pop();
    this.RULE_OCCURRENCE_STACK.pop();

    // NOOP when cst is disabled
    this.cstFinallyStateUpdate();

    if (this.RULE_STACK.length === 0 && this.isAtEndOfInput() === false) {
      const firstRedundantTok = this.LA(1);
      const errMsg = this.errorMessageProvider.buildNotAllInputParsedMessage({
        firstRedundant: firstRedundantTok,
        ruleName: this.getCurrRuleFullName(),
      });
      this.SAVE_ERROR(
        new NotAllInputParsedException(errMsg, firstRedundantTok),
      );
    }
  }

  subruleInternal<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    idx: number,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    let ruleResult;
    try {
      const args = options !== undefined ? options.ARGS : undefined;
      this.subruleIdx = idx;
      ruleResult = ruleToCall.apply(this, args);
      this.cstPostNonTerminal(
        ruleResult,
        options !== undefined && options.LABEL !== undefined
          ? options.LABEL
          : ruleToCall.ruleName,
      );
      return ruleResult;
    } catch (e) {
      throw this.subruleInternalError(e, options, ruleToCall.ruleName);
    }
  }

  subruleInternalError(
    this: MixedInParser,
    e: any,
    options: SubruleMethodOpts<unknown[]> | undefined,
    ruleName: string,
  ): void {
    if (isRecognitionException(e) && e.partialCstResult !== undefined) {
      this.cstPostNonTerminal(
        e.partialCstResult,
        options !== undefined && options.LABEL !== undefined
          ? options.LABEL
          : ruleName,
      );

      delete e.partialCstResult;
    }
    throw e;
  }

  consumeInternal(
    this: MixedInParser,
    tokType: TokenType,
    idx: number,
    options: ConsumeMethodOpts | undefined,
  ): IToken {
    let consumedToken!: IToken;
    try {
      const nextToken = this.LA(1);
      if (this.tokenMatcher(nextToken, tokType) === true) {
        this.consumeToken();
        consumedToken = nextToken;
      } else {
        this.consumeInternalError(tokType, nextToken, options);
      }
    } catch (eFromConsumption) {
      consumedToken = this.consumeInternalRecovery(
        tokType,
        idx,
        eFromConsumption,
      );
    }

    this.cstPostTerminal(
      options !== undefined && options.LABEL !== undefined
        ? options.LABEL
        : tokType.name,
      consumedToken,
    );
    return consumedToken;
  }

  consumeInternalError(
    this: MixedInParser,
    tokType: TokenType,
    nextToken: IToken,
    options: ConsumeMethodOpts | undefined,
  ): void {
    let msg;
    const previousToken = this.LA(0);
    if (options !== undefined && options.ERR_MSG) {
      msg = options.ERR_MSG;
    } else {
      msg = this.errorMessageProvider.buildMismatchTokenMessage({
        expected: tokType,
        actual: nextToken,
        previous: previousToken,
        ruleName: this.getCurrRuleFullName(),
      });
    }
    throw this.SAVE_ERROR(
      new MismatchedTokenException(msg, nextToken, previousToken),
    );
  }

  consumeInternalRecovery(
    this: MixedInParser,
    tokType: TokenType,
    idx: number,
    eFromConsumption: Error,
  ): IToken {
    // no recovery allowed during backtracking, otherwise backtracking may recover invalid syntax and accept it
    // but the original syntax could have been parsed successfully without any backtracking + recovery
    if (
      this.recoveryEnabled &&
      // TODO: more robust checking of the exception type. Perhaps Typescript extending expressions?
      eFromConsumption.name === "MismatchedTokenException" &&
      !this.isBackTracking()
    ) {
      const follows = this.getFollowsForInRuleRecovery(<any>tokType, idx);
      try {
        return this.tryInRuleRecovery(<any>tokType, follows);
      } catch (eFromInRuleRecovery) {
        if (eFromInRuleRecovery.name === IN_RULE_RECOVERY_EXCEPTION) {
          // failed in RuleRecovery.
          // throw the original error in order to trigger reSync error recovery
          throw eFromConsumption;
        } else {
          throw eFromInRuleRecovery;
        }
      }
    } else {
      throw eFromConsumption;
    }
  }

  saveRecogState(this: MixedInParser): IParserState {
    // errors is a getter which will clone the errors array
    const savedErrors = this.errors;
    const savedRuleStack = clone(this.RULE_STACK);
    return {
      errors: savedErrors,
      lexerState: this.exportLexerState(),
      RULE_STACK: savedRuleStack,
      CST_STACK: this.CST_STACK,
    };
  }

  reloadRecogState(this: MixedInParser, newState: IParserState) {
    this.errors = newState.errors;
    this.importLexerState(newState.lexerState);
    this.RULE_STACK = newState.RULE_STACK;
  }

  ruleInvocationStateUpdate(
    this: MixedInParser,
    shortName: number,
    fullName: string,
    idxInCallingRule: number,
  ): void {
    this.RULE_OCCURRENCE_STACK.push(idxInCallingRule);
    this.RULE_STACK.push(shortName);
    // NOOP when cst is disabled
    this.cstInvocationStateUpdate(fullName);
  }

  isBackTracking(this: MixedInParser): boolean {
    return this.isBackTrackingStack.length !== 0;
  }

  getCurrRuleFullName(this: MixedInParser): string {
    const shortName = this.getLastExplicitRuleShortName();
    return this.shortRuleNameToFull[shortName];
  }

  shortRuleNameToFullName(this: MixedInParser, shortName: number) {
    return this.shortRuleNameToFull[shortName];
  }

  public isAtEndOfInput(this: MixedInParser): boolean {
    return this.tokenMatcher(this.LA(1), EOF);
  }

  public reset(this: MixedInParser): void {
    this.resetLexerState();
    this.subruleIdx = 0;
    this.isBackTrackingStack = [];
    this.errors = [];
    this.RULE_STACK = [];
    // TODO: extract a specific reset for TreeBuilder trait
    this.CST_STACK = [];
    this.RULE_OCCURRENCE_STACK = [];
  }
}
