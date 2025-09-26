import {
  createTokenInstance,
  EOF,
  tokenMatcher,
} from "../../../scan/tokens_public.js";
import {
  AbstractNextTerminalAfterProductionWalker,
  IFirstAfterRepetition,
} from "../../grammar/interpreter.js";
import {
  clone,
  dropRight,
  find,
  flatten,
  has,
  includes,
  isEmpty,
  map,
} from "lodash-es";
import {
  IParserConfig,
  IToken,
  ITokenGrammarPath,
  TokenType,
} from "@chevrotain/types";
import { MismatchedTokenException } from "../../exceptions_public.js";
import { IN } from "../../constants.js";
import { MixedInParser } from "./parser_traits.js";
import { DEFAULT_PARSER_CONFIG } from "../parser.js";

export const EOF_FOLLOW_KEY: any = {};

export interface IFollowKey {
  ruleName: string;
  idxInCallingRule: number;
  inRule: string;
}

export const IN_RULE_RECOVERY_EXCEPTION = "InRuleRecoveryException";

export class InRuleRecoveryException extends Error {
  constructor(message: string) {
    super(message);
    this.name = IN_RULE_RECOVERY_EXCEPTION;
  }
}

/**
 * This trait is responsible for the error recovery and fault tolerant logic
 */
export class Recoverable {
  recoveryEnabled: boolean;
  firstAfterRepMap: Record<string, IFirstAfterRepetition>;
  resyncFollows: Record<string, TokenType[]>;

  initRecoverable(config: IParserConfig) {
    this.firstAfterRepMap = {};
    this.resyncFollows = {};

    this.recoveryEnabled = has(config, "recoveryEnabled")
      ? (config.recoveryEnabled as boolean) // assumes end user provides the correct config value/type
      : DEFAULT_PARSER_CONFIG.recoveryEnabled;

    // performance optimization, NOOP will be inlined which
    // effectively means that this optional feature does not exist
    // when not used.
    if (this.recoveryEnabled) {
      this.attemptInRepetitionRecovery = attemptInRepetitionRecovery;
    }
  }

  public getTokenToInsert(tokType: TokenType): IToken {
    const tokToInsert = createTokenInstance(
      tokType,
      "",
      NaN,
      NaN,
      NaN,
      NaN,
      NaN,
      NaN,
    );
    tokToInsert.isInsertedInRecovery = true;
    return tokToInsert;
  }

  public canTokenTypeBeInsertedInRecovery(tokType: TokenType): boolean {
    return true;
  }

  public canTokenTypeBeDeletedInRecovery(tokType: TokenType): boolean {
    return true;
  }

  tryInRepetitionRecovery(
    this: MixedInParser,
    grammarRule: Function,
    grammarRuleArgs: any[],
    lookAheadFunc: () => boolean,
    expectedTokType: TokenType,
  ): void {
    // TODO: can the resyncTokenType be cached?
    const reSyncTokType = this.findReSyncTokenType();
    const savedLexerState = this.exportLexerState();
    const resyncedTokens: IToken[] = [];
    let passedResyncPoint = false;

    const nextTokenWithoutResync = this.LA(1);
    let currToken = this.LA(1);

    const generateErrorMessage = () => {
      const previousToken = this.LA(0);
      // we are preemptively re-syncing before an error has been detected, therefor we must reproduce
      // the error that would have been thrown
      const msg = this.errorMessageProvider.buildMismatchTokenMessage({
        expected: expectedTokType,
        actual: nextTokenWithoutResync,
        previous: previousToken,
        ruleName: this.getCurrRuleFullName(),
      });
      const error = new MismatchedTokenException(
        msg,
        nextTokenWithoutResync,
        this.LA(0),
      );
      // the first token here will be the original cause of the error, this is not part of the resyncedTokens property.
      error.resyncedTokens = dropRight(resyncedTokens);
      this.SAVE_ERROR(error);
    };

    while (!passedResyncPoint) {
      // re-synced to a point where we can safely exit the repetition/
      if (this.tokenMatcher(currToken, expectedTokType)) {
        generateErrorMessage();
        return; // must return here to avoid reverting the inputIdx
      } else if (lookAheadFunc.call(this)) {
        // we skipped enough tokens so we can resync right back into another iteration of the repetition grammar rule
        generateErrorMessage();
        // recursive invocation in other to support multiple re-syncs in the same top level repetition grammar rule
        grammarRule.apply(this, grammarRuleArgs);
        return; // must return here to avoid reverting the inputIdx
      } else if (this.tokenMatcher(currToken, reSyncTokType)) {
        passedResyncPoint = true;
      } else {
        currToken = this.SKIP_TOKEN();
        this.addToResyncTokens(currToken, resyncedTokens);
      }
    }

    // we were unable to find a CLOSER point to resync inside the Repetition, reset the state.
    // The parsing exception we were trying to prevent will happen in the NEXT parsing step. it may be handled by
    // "between rules" resync recovery later in the flow.
    this.importLexerState(savedLexerState);
  }

  shouldInRepetitionRecoveryBeTried(
    this: MixedInParser,
    expectTokAfterLastMatch: TokenType,
    nextTokIdx: number,
    notStuck: boolean | undefined,
  ): boolean {
    // Edge case of arriving from a MANY repetition which is stuck
    // Attempting recovery in this case could cause an infinite loop
    if (notStuck === false) {
      return false;
    }

    // no need to recover, next token is what we expect...
    if (this.tokenMatcher(this.LA(1), expectTokAfterLastMatch)) {
      return false;
    }

    // error recovery is disabled during backtracking as it can make the parser ignore a valid grammar path
    // and prefer some backtracking path that includes recovered errors.
    if (this.isBackTracking()) {
      return false;
    }

    // if we can perform inRule recovery (single token insertion or deletion) we always prefer that recovery algorithm
    // because if it works, it makes the least amount of changes to the input stream (greedy algorithm)
    //noinspection RedundantIfStatementJS
    if (
      this.canPerformInRuleRecovery(
        expectTokAfterLastMatch,
        this.getFollowsForInRuleRecovery(expectTokAfterLastMatch, nextTokIdx),
      )
    ) {
      return false;
    }

    return true;
  }

  // Error Recovery functionality
  getFollowsForInRuleRecovery(
    this: MixedInParser,
    tokType: TokenType,
    tokIdxInRule: number,
  ): TokenType[] {
    const grammarPath = this.getCurrentGrammarPath(tokType, tokIdxInRule);
    const follows = this.getNextPossibleTokenTypes(grammarPath);
    return follows;
  }

  tryInRuleRecovery(
    this: MixedInParser,
    expectedTokType: TokenType,
    follows: TokenType[],
  ): IToken {
    if (this.canRecoverWithSingleTokenInsertion(expectedTokType, follows)) {
      const tokToInsert = this.getTokenToInsert(expectedTokType);
      return tokToInsert;
    }

    if (this.canRecoverWithSingleTokenDeletion(expectedTokType)) {
      const nextTok = this.SKIP_TOKEN();
      this.consumeToken();
      return nextTok;
    }

    throw new InRuleRecoveryException("sad sad panda");
  }

  canPerformInRuleRecovery(
    this: MixedInParser,
    expectedToken: TokenType,
    follows: TokenType[],
  ): boolean {
    return (
      this.canRecoverWithSingleTokenInsertion(expectedToken, follows) ||
      this.canRecoverWithSingleTokenDeletion(expectedToken)
    );
  }

  canRecoverWithSingleTokenInsertion(
    this: MixedInParser,
    expectedTokType: TokenType,
    follows: TokenType[],
  ): boolean {
    if (!this.canTokenTypeBeInsertedInRecovery(expectedTokType)) {
      return false;
    }

    // must know the possible following tokens to perform single token insertion
    if (isEmpty(follows)) {
      return false;
    }

    const mismatchedTok = this.LA(1);
    const isMisMatchedTokInFollows =
      find(follows, (possibleFollowsTokType: TokenType) => {
        return this.tokenMatcher(mismatchedTok, possibleFollowsTokType);
      }) !== undefined;

    return isMisMatchedTokInFollows;
  }

  canRecoverWithSingleTokenDeletion(
    this: MixedInParser,
    expectedTokType: TokenType,
  ): boolean {
    if (!this.canTokenTypeBeDeletedInRecovery(expectedTokType)) {
      return false;
    }

    const isNextTokenWhatIsExpected = this.tokenMatcher(
      this.LA(2),
      expectedTokType,
    );
    return isNextTokenWhatIsExpected;
  }

  isInCurrentRuleReSyncSet(
    this: MixedInParser,
    tokenTypeIdx: TokenType,
  ): boolean {
    const followKey = this.getCurrFollowKey();
    const currentRuleReSyncSet = this.getFollowSetFromFollowKey(followKey);
    return includes(currentRuleReSyncSet, tokenTypeIdx);
  }

  findReSyncTokenType(this: MixedInParser): TokenType {
    const allPossibleReSyncTokTypes = this.flattenFollowSet();
    // this loop will always terminate as EOF is always in the follow stack and also always (virtually) in the input
    let nextToken = this.LA(1);
    let k = 2;
    while (true) {
      const foundMatch = find(allPossibleReSyncTokTypes, (resyncTokType) => {
        const canMatch = tokenMatcher(nextToken, resyncTokType);
        return canMatch;
      });
      if (foundMatch !== undefined) {
        return foundMatch;
      }
      nextToken = this.LA(k);
      k++;
    }
  }

  getCurrFollowKey(this: MixedInParser): IFollowKey {
    // the length is at least one as we always add the ruleName to the stack before invoking the rule.
    if (this.RULE_STACK.length === 1) {
      return EOF_FOLLOW_KEY;
    }
    const currRuleShortName = this.getLastExplicitRuleShortName();
    const currRuleIdx = this.getLastExplicitRuleOccurrenceIndex();
    const prevRuleShortName = this.getPreviousExplicitRuleShortName();

    return {
      ruleName: this.shortRuleNameToFullName(currRuleShortName),
      idxInCallingRule: currRuleIdx,
      inRule: this.shortRuleNameToFullName(prevRuleShortName),
    };
  }

  buildFullFollowKeyStack(this: MixedInParser): IFollowKey[] {
    const explicitRuleStack = this.RULE_STACK;
    const explicitOccurrenceStack = this.RULE_OCCURRENCE_STACK;

    return map(explicitRuleStack, (ruleName, idx) => {
      if (idx === 0) {
        return EOF_FOLLOW_KEY;
      }
      return {
        ruleName: this.shortRuleNameToFullName(ruleName),
        idxInCallingRule: explicitOccurrenceStack[idx],
        inRule: this.shortRuleNameToFullName(explicitRuleStack[idx - 1]),
      };
    });
  }

  flattenFollowSet(this: MixedInParser): TokenType[] {
    const followStack = map(this.buildFullFollowKeyStack(), (currKey) => {
      return this.getFollowSetFromFollowKey(currKey);
    });
    return <any>flatten(followStack);
  }

  getFollowSetFromFollowKey(
    this: MixedInParser,
    followKey: IFollowKey,
  ): TokenType[] {
    if (followKey === EOF_FOLLOW_KEY) {
      return [EOF];
    }

    const followName =
      followKey.ruleName + followKey.idxInCallingRule + IN + followKey.inRule;

    return this.resyncFollows[followName];
  }

  // It does not make any sense to include a virtual EOF token in the list of resynced tokens
  // as EOF does not really exist and thus does not contain any useful information (line/column numbers)
  addToResyncTokens(
    this: MixedInParser,
    token: IToken,
    resyncTokens: IToken[],
  ): IToken[] {
    if (!this.tokenMatcher(token, EOF)) {
      resyncTokens.push(token);
    }
    return resyncTokens;
  }

  reSyncTo(this: MixedInParser, tokType: TokenType): IToken[] {
    const resyncedTokens: IToken[] = [];
    let nextTok = this.LA(1);
    while (this.tokenMatcher(nextTok, tokType) === false) {
      nextTok = this.SKIP_TOKEN();
      this.addToResyncTokens(nextTok, resyncedTokens);
    }
    // the last token is not part of the error.
    return dropRight(resyncedTokens);
  }

  attemptInRepetitionRecovery(
    this: MixedInParser,
    prodFunc: Function,
    args: any[],
    lookaheadFunc: () => boolean,
    dslMethodIdx: number,
    prodOccurrence: number,
    nextToksWalker: typeof AbstractNextTerminalAfterProductionWalker,
    notStuck?: boolean,
  ): void {
    // by default this is a NO-OP
    // The actual implementation is with the function(not method) below
  }

  getCurrentGrammarPath(
    this: MixedInParser,
    tokType: TokenType,
    tokIdxInRule: number,
  ): ITokenGrammarPath {
    const pathRuleStack: string[] = this.getHumanReadableRuleStack();
    const pathOccurrenceStack: number[] = clone(this.RULE_OCCURRENCE_STACK);
    const grammarPath: any = {
      ruleStack: pathRuleStack,
      occurrenceStack: pathOccurrenceStack,
      lastTok: tokType,
      lastTokOccurrence: tokIdxInRule,
    };

    return grammarPath;
  }
  getHumanReadableRuleStack(this: MixedInParser): string[] {
    return map(this.RULE_STACK, (currShortName) =>
      this.shortRuleNameToFullName(currShortName),
    );
  }
}

export function attemptInRepetitionRecovery(
  this: MixedInParser,
  prodFunc: Function,
  args: any[],
  lookaheadFunc: () => boolean,
  dslMethodIdx: number,
  prodOccurrence: number,
  nextToksWalker: typeof AbstractNextTerminalAfterProductionWalker,
  notStuck?: boolean,
): void {
  const key = this.getKeyForAutomaticLookahead(dslMethodIdx, prodOccurrence);
  let firstAfterRepInfo = this.firstAfterRepMap[key];
  if (firstAfterRepInfo === undefined) {
    const currRuleName = this.getCurrRuleFullName();
    const ruleGrammar = this.getGAstProductions()[currRuleName];
    const walker: AbstractNextTerminalAfterProductionWalker =
      new nextToksWalker(ruleGrammar, prodOccurrence);
    firstAfterRepInfo = walker.startWalking();
    this.firstAfterRepMap[key] = firstAfterRepInfo;
  }

  let expectTokAfterLastMatch = firstAfterRepInfo.token;
  let nextTokIdx = firstAfterRepInfo.occurrence;
  const isEndOfRule = firstAfterRepInfo.isEndOfRule;

  // special edge case of a TOP most repetition after which the input should END.
  // this will force an attempt for inRule recovery in that scenario.
  if (
    this.RULE_STACK.length === 1 &&
    isEndOfRule &&
    expectTokAfterLastMatch === undefined
  ) {
    expectTokAfterLastMatch = EOF;
    nextTokIdx = 1;
  }

  // We don't have anything to re-sync to...
  // this condition was extracted from `shouldInRepetitionRecoveryBeTried` to act as a type-guard
  if (expectTokAfterLastMatch === undefined || nextTokIdx === undefined) {
    return;
  }

  if (
    this.shouldInRepetitionRecoveryBeTried(
      expectTokAfterLastMatch,
      nextTokIdx,
      notStuck,
    )
  ) {
    // TODO: performance optimization: instead of passing the original args here, we modify
    // the args param (or create a new one) and make sure the lookahead func is explicitly provided
    // to avoid searching the cache for it once more.
    this.tryInRepetitionRecovery(
      prodFunc,
      args,
      lookaheadFunc,
      expectTokAfterLastMatch,
    );
  }
}
