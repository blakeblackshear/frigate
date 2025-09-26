import {
  analyzeTokenTypes,
  charCodeToOptimizedIndex,
  cloneEmptyGroups,
  DEFAULT_MODE,
  IAnalyzeResult,
  IPatternConfig,
  LineTerminatorOptimizedTester,
  performRuntimeChecks,
  performWarningRuntimeChecks,
  SUPPORT_STICKY,
  validatePatterns,
} from "./lexer.js";
import {
  assign,
  clone,
  forEach,
  identity,
  isArray,
  isEmpty,
  isUndefined,
  keys,
  last,
  map,
  noop,
  reduce,
  reject,
} from "lodash-es";
import { PRINT_WARNING, timer, toFastProperties } from "@chevrotain/utils";
import { augmentTokenTypes } from "./tokens.js";
import {
  CustomPatternMatcherFunc,
  CustomPatternMatcherReturn,
  ILexerConfig,
  ILexerDefinitionError,
  ILexingError,
  IMultiModeLexerDefinition,
  IToken,
  TokenType,
} from "@chevrotain/types";
import { defaultLexerErrorProvider } from "./lexer_errors_public.js";
import { clearRegExpParserCache } from "./reg_exp_parser.js";

export interface ILexingResult {
  tokens: IToken[];
  groups: { [groupName: string]: IToken[] };
  errors: ILexingError[];
}

export enum LexerDefinitionErrorType {
  MISSING_PATTERN,
  INVALID_PATTERN,
  EOI_ANCHOR_FOUND,
  UNSUPPORTED_FLAGS_FOUND,
  DUPLICATE_PATTERNS_FOUND,
  INVALID_GROUP_TYPE_FOUND,
  PUSH_MODE_DOES_NOT_EXIST,
  MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE,
  MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY,
  MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST,
  LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED,
  SOI_ANCHOR_FOUND,
  EMPTY_MATCH_PATTERN,
  NO_LINE_BREAKS_FLAGS,
  UNREACHABLE_PATTERN,
  IDENTIFY_TERMINATOR,
  CUSTOM_LINE_BREAK,
  MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE,
}

export interface IRegExpExec {
  exec: CustomPatternMatcherFunc;
}

const DEFAULT_LEXER_CONFIG: Required<ILexerConfig> = {
  deferDefinitionErrorsHandling: false,
  positionTracking: "full",
  lineTerminatorsPattern: /\n|\r\n?/g,
  lineTerminatorCharacters: ["\n", "\r"],
  ensureOptimizations: false,
  safeMode: false,
  errorMessageProvider: defaultLexerErrorProvider,
  traceInitPerf: false,
  skipValidations: false,
  recoveryEnabled: true,
};

Object.freeze(DEFAULT_LEXER_CONFIG);

export class Lexer {
  public static SKIPPED =
    "This marks a skipped Token pattern, this means each token identified by it will" +
    "be consumed and then thrown into oblivion, this can be used to for example to completely ignore whitespace.";

  public static NA = /NOT_APPLICABLE/;
  public lexerDefinitionErrors: ILexerDefinitionError[] = [];
  public lexerDefinitionWarning: ILexerDefinitionError[] = [];

  protected patternIdxToConfig: Record<string, IPatternConfig[]> = {};
  protected charCodeToPatternIdxToConfig: {
    [modeName: string]: { [charCode: number]: IPatternConfig[] };
  } = {};

  protected modes: string[] = [];
  protected defaultMode!: string;
  protected emptyGroups: { [groupName: string]: IToken } = {};

  private config: Required<ILexerConfig>;
  private trackStartLines: boolean = true;
  private trackEndLines: boolean = true;
  private hasCustom: boolean = false;
  private canModeBeOptimized: Record<string, boolean> = {};

  private traceInitPerf!: boolean | number;
  private traceInitMaxIdent!: number;
  private traceInitIndent: number;

  constructor(
    protected lexerDefinition: TokenType[] | IMultiModeLexerDefinition,
    config: ILexerConfig = DEFAULT_LEXER_CONFIG,
  ) {
    if (typeof config === "boolean") {
      throw Error(
        "The second argument to the Lexer constructor is now an ILexerConfig Object.\n" +
          "a boolean 2nd argument is no longer supported",
      );
    }

    // todo: defaults func?
    this.config = assign({}, DEFAULT_LEXER_CONFIG, config) as any;

    const traceInitVal = this.config.traceInitPerf;
    if (traceInitVal === true) {
      this.traceInitMaxIdent = Infinity;
      this.traceInitPerf = true;
    } else if (typeof traceInitVal === "number") {
      this.traceInitMaxIdent = traceInitVal;
      this.traceInitPerf = true;
    }
    this.traceInitIndent = -1;

    this.TRACE_INIT("Lexer Constructor", () => {
      let actualDefinition!: IMultiModeLexerDefinition;
      let hasOnlySingleMode = true;
      this.TRACE_INIT("Lexer Config handling", () => {
        if (
          this.config.lineTerminatorsPattern ===
          DEFAULT_LEXER_CONFIG.lineTerminatorsPattern
        ) {
          // optimized built-in implementation for the defaults definition of lineTerminators
          this.config.lineTerminatorsPattern = LineTerminatorOptimizedTester;
        } else {
          if (
            this.config.lineTerminatorCharacters ===
            DEFAULT_LEXER_CONFIG.lineTerminatorCharacters
          ) {
            throw Error(
              "Error: Missing <lineTerminatorCharacters> property on the Lexer config.\n" +
                "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#MISSING_LINE_TERM_CHARS",
            );
          }
        }

        if (config.safeMode && config.ensureOptimizations) {
          throw Error(
            '"safeMode" and "ensureOptimizations" flags are mutually exclusive.',
          );
        }

        this.trackStartLines = /full|onlyStart/i.test(
          this.config.positionTracking,
        );
        this.trackEndLines = /full/i.test(this.config.positionTracking);

        // Convert SingleModeLexerDefinition into a IMultiModeLexerDefinition.
        if (isArray(lexerDefinition)) {
          actualDefinition = {
            modes: { defaultMode: clone(lexerDefinition) },
            defaultMode: DEFAULT_MODE,
          };
        } else {
          // no conversion needed, input should already be a IMultiModeLexerDefinition
          hasOnlySingleMode = false;
          actualDefinition = clone(<IMultiModeLexerDefinition>lexerDefinition);
        }
      });

      if (this.config.skipValidations === false) {
        this.TRACE_INIT("performRuntimeChecks", () => {
          this.lexerDefinitionErrors = this.lexerDefinitionErrors.concat(
            performRuntimeChecks(
              actualDefinition,
              this.trackStartLines,
              this.config.lineTerminatorCharacters,
            ),
          );
        });

        this.TRACE_INIT("performWarningRuntimeChecks", () => {
          this.lexerDefinitionWarning = this.lexerDefinitionWarning.concat(
            performWarningRuntimeChecks(
              actualDefinition,
              this.trackStartLines,
              this.config.lineTerminatorCharacters,
            ),
          );
        });
      }

      // for extra robustness to avoid throwing an none informative error message
      actualDefinition.modes = actualDefinition.modes
        ? actualDefinition.modes
        : {};

      // an error of undefined TokenTypes will be detected in "performRuntimeChecks" above.
      // this transformation is to increase robustness in the case of partially invalid lexer definition.
      forEach(actualDefinition.modes, (currModeValue, currModeName) => {
        actualDefinition.modes[currModeName] = reject<TokenType>(
          currModeValue,
          (currTokType) => isUndefined(currTokType),
        );
      });

      const allModeNames = keys(actualDefinition.modes);

      forEach(
        actualDefinition.modes,
        (currModDef: TokenType[], currModName) => {
          this.TRACE_INIT(`Mode: <${currModName}> processing`, () => {
            this.modes.push(currModName);

            if (this.config.skipValidations === false) {
              this.TRACE_INIT(`validatePatterns`, () => {
                this.lexerDefinitionErrors = this.lexerDefinitionErrors.concat(
                  validatePatterns(currModDef, allModeNames),
                );
              });
            }

            // If definition errors were encountered, the analysis phase may fail unexpectedly/
            // Considering a lexer with definition errors may never be used, there is no point
            // to performing the analysis anyhow...
            if (isEmpty(this.lexerDefinitionErrors)) {
              augmentTokenTypes(currModDef);

              let currAnalyzeResult!: IAnalyzeResult;
              this.TRACE_INIT(`analyzeTokenTypes`, () => {
                currAnalyzeResult = analyzeTokenTypes(currModDef, {
                  lineTerminatorCharacters:
                    this.config.lineTerminatorCharacters,
                  positionTracking: config.positionTracking,
                  ensureOptimizations: config.ensureOptimizations,
                  safeMode: config.safeMode,
                  tracer: this.TRACE_INIT,
                });
              });

              this.patternIdxToConfig[currModName] =
                currAnalyzeResult.patternIdxToConfig;

              this.charCodeToPatternIdxToConfig[currModName] =
                currAnalyzeResult.charCodeToPatternIdxToConfig;

              this.emptyGroups = assign(
                {},
                this.emptyGroups,
                currAnalyzeResult.emptyGroups,
              ) as any;

              this.hasCustom = currAnalyzeResult.hasCustom || this.hasCustom;

              this.canModeBeOptimized[currModName] =
                currAnalyzeResult.canBeOptimized;
            }
          });
        },
      );

      this.defaultMode = actualDefinition.defaultMode;

      if (
        !isEmpty(this.lexerDefinitionErrors) &&
        !this.config.deferDefinitionErrorsHandling
      ) {
        const allErrMessages = map(this.lexerDefinitionErrors, (error) => {
          return error.message;
        });
        const allErrMessagesString = allErrMessages.join(
          "-----------------------\n",
        );
        throw new Error(
          "Errors detected in definition of Lexer:\n" + allErrMessagesString,
        );
      }

      // Only print warning if there are no errors, This will avoid pl
      forEach(this.lexerDefinitionWarning, (warningDescriptor) => {
        PRINT_WARNING(warningDescriptor.message);
      });

      this.TRACE_INIT("Choosing sub-methods implementations", () => {
        // Choose the relevant internal implementations for this specific parser.
        // These implementations should be in-lined by the JavaScript engine
        // to provide optimal performance in each scenario.
        if (SUPPORT_STICKY) {
          this.chopInput = <any>identity;
          this.match = this.matchWithTest;
        } else {
          this.updateLastIndex = noop;
          this.match = this.matchWithExec;
        }

        if (hasOnlySingleMode) {
          this.handleModes = noop;
        }

        if (this.trackStartLines === false) {
          this.computeNewColumn = identity;
        }

        if (this.trackEndLines === false) {
          this.updateTokenEndLineColumnLocation = noop;
        }

        if (/full/i.test(this.config.positionTracking)) {
          this.createTokenInstance = this.createFullToken;
        } else if (/onlyStart/i.test(this.config.positionTracking)) {
          this.createTokenInstance = this.createStartOnlyToken;
        } else if (/onlyOffset/i.test(this.config.positionTracking)) {
          this.createTokenInstance = this.createOffsetOnlyToken;
        } else {
          throw Error(
            `Invalid <positionTracking> config option: "${this.config.positionTracking}"`,
          );
        }

        if (this.hasCustom) {
          this.addToken = this.addTokenUsingPush;
          this.handlePayload = this.handlePayloadWithCustom;
        } else {
          this.addToken = this.addTokenUsingMemberAccess;
          this.handlePayload = this.handlePayloadNoCustom;
        }
      });

      this.TRACE_INIT("Failed Optimization Warnings", () => {
        const unOptimizedModes = reduce(
          this.canModeBeOptimized,
          (cannotBeOptimized, canBeOptimized, modeName) => {
            if (canBeOptimized === false) {
              cannotBeOptimized.push(modeName);
            }
            return cannotBeOptimized;
          },
          [] as string[],
        );

        if (config.ensureOptimizations && !isEmpty(unOptimizedModes)) {
          throw Error(
            `Lexer Modes: < ${unOptimizedModes.join(
              ", ",
            )} > cannot be optimized.\n` +
              '\t Disable the "ensureOptimizations" lexer config flag to silently ignore this and run the lexer in an un-optimized mode.\n' +
              "\t Or inspect the console log for details on how to resolve these issues.",
          );
        }
      });

      this.TRACE_INIT("clearRegExpParserCache", () => {
        clearRegExpParserCache();
      });

      this.TRACE_INIT("toFastProperties", () => {
        toFastProperties(this);
      });
    });
  }

  public tokenize(
    text: string,
    initialMode: string = this.defaultMode,
  ): ILexingResult {
    if (!isEmpty(this.lexerDefinitionErrors)) {
      const allErrMessages = map(this.lexerDefinitionErrors, (error) => {
        return error.message;
      });
      const allErrMessagesString = allErrMessages.join(
        "-----------------------\n",
      );
      throw new Error(
        "Unable to Tokenize because Errors detected in definition of Lexer:\n" +
          allErrMessagesString,
      );
    }

    return this.tokenizeInternal(text, initialMode);
  }

  // There is quite a bit of duplication between this and "tokenizeInternalLazy"
  // This is intentional due to performance considerations.
  // this method also used quite a bit of `!` none null assertions because it is too optimized
  // for `tsc` to always understand it is "safe"
  private tokenizeInternal(text: string, initialMode: string): ILexingResult {
    let i,
      j,
      k,
      matchAltImage,
      longerAlt,
      matchedImage: string | null,
      payload,
      altPayload,
      imageLength,
      group,
      tokType,
      newToken: IToken,
      errLength,
      droppedChar,
      msg,
      match;
    const orgText = text;
    const orgLength = orgText.length;
    let offset = 0;
    let matchedTokensIndex = 0;
    // initializing the tokensArray to the "guessed" size.
    // guessing too little will still reduce the number of array re-sizes on pushes.
    // guessing too large (Tested by guessing x4 too large) may cost a bit more of memory
    // but would still have a faster runtime by avoiding (All but one) array resizing.
    const guessedNumberOfTokens = this.hasCustom
      ? 0 // will break custom token pattern APIs the matchedTokens array will contain undefined elements.
      : Math.floor(text.length / 10);
    const matchedTokens = new Array(guessedNumberOfTokens);
    const errors: ILexingError[] = [];
    let line = this.trackStartLines ? 1 : undefined;
    let column = this.trackStartLines ? 1 : undefined;
    const groups: any = cloneEmptyGroups(this.emptyGroups);
    const trackLines = this.trackStartLines;
    const lineTerminatorPattern = this.config.lineTerminatorsPattern;

    let currModePatternsLength = 0;
    let patternIdxToConfig: IPatternConfig[] = [];
    let currCharCodeToPatternIdxToConfig: {
      [charCode: number]: IPatternConfig[];
    } = [];

    const modeStack: string[] = [];

    const emptyArray: IPatternConfig[] = [];
    Object.freeze(emptyArray);
    let getPossiblePatterns!: (charCode: number) => IPatternConfig[];

    function getPossiblePatternsSlow() {
      return patternIdxToConfig;
    }

    function getPossiblePatternsOptimized(charCode: number): IPatternConfig[] {
      const optimizedCharIdx = charCodeToOptimizedIndex(charCode);
      const possiblePatterns =
        currCharCodeToPatternIdxToConfig[optimizedCharIdx];
      if (possiblePatterns === undefined) {
        return emptyArray;
      } else {
        return possiblePatterns;
      }
    }

    const pop_mode = (popToken: IToken) => {
      // TODO: perhaps avoid this error in the edge case there is no more input?
      if (
        modeStack.length === 1 &&
        // if we have both a POP_MODE and a PUSH_MODE this is in-fact a "transition"
        // So no error should occur.
        popToken.tokenType.PUSH_MODE === undefined
      ) {
        // if we try to pop the last mode there lexer will no longer have ANY mode.
        // thus the pop is ignored, an error will be created and the lexer will continue parsing in the previous mode.
        const msg =
          this.config.errorMessageProvider.buildUnableToPopLexerModeMessage(
            popToken,
          );

        errors.push({
          offset: popToken.startOffset,
          line: popToken.startLine,
          column: popToken.startColumn,
          length: popToken.image.length,
          message: msg,
        });
      } else {
        modeStack.pop();
        const newMode = last(modeStack)!;
        patternIdxToConfig = this.patternIdxToConfig[newMode];
        currCharCodeToPatternIdxToConfig =
          this.charCodeToPatternIdxToConfig[newMode];
        currModePatternsLength = patternIdxToConfig.length;
        const modeCanBeOptimized =
          this.canModeBeOptimized[newMode] && this.config.safeMode === false;

        if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
          getPossiblePatterns = getPossiblePatternsOptimized;
        } else {
          getPossiblePatterns = getPossiblePatternsSlow;
        }
      }
    };

    function push_mode(this: Lexer, newMode: string) {
      modeStack.push(newMode);
      currCharCodeToPatternIdxToConfig =
        this.charCodeToPatternIdxToConfig[newMode];

      patternIdxToConfig = this.patternIdxToConfig[newMode];
      currModePatternsLength = patternIdxToConfig.length;

      currModePatternsLength = patternIdxToConfig.length;
      const modeCanBeOptimized =
        this.canModeBeOptimized[newMode] && this.config.safeMode === false;

      if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
        getPossiblePatterns = getPossiblePatternsOptimized;
      } else {
        getPossiblePatterns = getPossiblePatternsSlow;
      }
    }

    // this pattern seems to avoid a V8 de-optimization, although that de-optimization does not
    // seem to matter performance wise.
    push_mode.call(this, initialMode);

    let currConfig!: IPatternConfig;

    const recoveryEnabled = this.config.recoveryEnabled;

    while (offset < orgLength) {
      matchedImage = null;

      const nextCharCode = orgText.charCodeAt(offset);
      const chosenPatternIdxToConfig = getPossiblePatterns(nextCharCode);
      const chosenPatternsLength = chosenPatternIdxToConfig.length;

      for (i = 0; i < chosenPatternsLength; i++) {
        currConfig = chosenPatternIdxToConfig[i];
        const currPattern = currConfig.pattern;
        payload = null;

        // manually in-lined because > 600 chars won't be in-lined in V8
        const singleCharCode = currConfig.short;
        if (singleCharCode !== false) {
          if (nextCharCode === singleCharCode) {
            // single character string
            matchedImage = currPattern as string;
          }
        } else if (currConfig.isCustom === true) {
          match = (currPattern as IRegExpExec).exec(
            orgText,
            offset,
            matchedTokens,
            groups,
          );
          if (match !== null) {
            matchedImage = match[0];
            if ((match as CustomPatternMatcherReturn).payload !== undefined) {
              payload = (match as CustomPatternMatcherReturn).payload;
            }
          } else {
            matchedImage = null;
          }
        } else {
          this.updateLastIndex(currPattern as RegExp, offset);
          matchedImage = this.match(currPattern as RegExp, text, offset);
        }

        if (matchedImage !== null) {
          // even though this pattern matched we must try a another longer alternative.
          // this can be used to prioritize keywords over identifiers
          longerAlt = currConfig.longerAlt;
          if (longerAlt !== undefined) {
            // TODO: micro optimize, avoid extra prop access
            // by saving/linking longerAlt on the original config?
            const longerAltLength = longerAlt.length;
            for (k = 0; k < longerAltLength; k++) {
              const longerAltConfig = patternIdxToConfig[longerAlt[k]];
              const longerAltPattern = longerAltConfig.pattern;
              altPayload = null;

              // single Char can never be a longer alt so no need to test it.
              // manually in-lined because > 600 chars won't be in-lined in V8
              if (longerAltConfig.isCustom === true) {
                match = (longerAltPattern as IRegExpExec).exec(
                  orgText,
                  offset,
                  matchedTokens,
                  groups,
                );
                if (match !== null) {
                  matchAltImage = match[0];
                  if (
                    (match as CustomPatternMatcherReturn).payload !== undefined
                  ) {
                    altPayload = (match as CustomPatternMatcherReturn).payload;
                  }
                } else {
                  matchAltImage = null;
                }
              } else {
                this.updateLastIndex(longerAltPattern as RegExp, offset);
                matchAltImage = this.match(
                  longerAltPattern as RegExp,
                  text,
                  offset,
                );
              }

              if (matchAltImage && matchAltImage.length > matchedImage.length) {
                matchedImage = matchAltImage;
                payload = altPayload;
                currConfig = longerAltConfig;
                // Exit the loop early after matching one of the longer alternatives
                // The first matched alternative takes precedence
                break;
              }
            }
          }
          break;
        }
      }

      // successful match
      if (matchedImage !== null) {
        imageLength = matchedImage.length;
        group = currConfig.group;
        if (group !== undefined) {
          tokType = currConfig.tokenTypeIdx;
          // TODO: "offset + imageLength" and the new column may be computed twice in case of "full" location information inside
          // createFullToken method
          newToken = this.createTokenInstance(
            matchedImage,
            offset,
            tokType,
            currConfig.tokenType,
            line,
            column,
            imageLength,
          );

          this.handlePayload(newToken, payload);

          // TODO: optimize NOOP in case there are no special groups?
          if (group === false) {
            matchedTokensIndex = this.addToken(
              matchedTokens,
              matchedTokensIndex,
              newToken,
            );
          } else {
            groups[group].push(newToken);
          }
        }
        text = this.chopInput(text, imageLength);
        offset = offset + imageLength;

        // TODO: with newlines the column may be assigned twice
        column = this.computeNewColumn(column!, imageLength);

        if (trackLines === true && currConfig.canLineTerminator === true) {
          let numOfLTsInMatch = 0;
          let foundTerminator;
          let lastLTEndOffset: number;
          lineTerminatorPattern.lastIndex = 0;
          do {
            foundTerminator = lineTerminatorPattern.test(matchedImage);
            if (foundTerminator === true) {
              lastLTEndOffset = lineTerminatorPattern.lastIndex - 1;
              numOfLTsInMatch++;
            }
          } while (foundTerminator === true);

          if (numOfLTsInMatch !== 0) {
            line = line! + numOfLTsInMatch;
            column = imageLength - lastLTEndOffset!;
            this.updateTokenEndLineColumnLocation(
              newToken!,
              group!,
              lastLTEndOffset!,
              numOfLTsInMatch,
              line,
              column,
              imageLength,
            );
          }
        }
        // will be NOOP if no modes present
        this.handleModes(currConfig, pop_mode, push_mode, newToken!);
      } else {
        // error recovery, drop characters until we identify a valid token's start point
        const errorStartOffset = offset;
        const errorLine = line;
        const errorColumn = column;
        let foundResyncPoint = recoveryEnabled === false;

        while (foundResyncPoint === false && offset < orgLength) {
          // Identity Func (when sticky flag is enabled)
          text = this.chopInput(text, 1);
          offset++;
          for (j = 0; j < currModePatternsLength; j++) {
            const currConfig = patternIdxToConfig[j];
            const currPattern = currConfig.pattern;

            // manually in-lined because > 600 chars won't be in-lined in V8
            const singleCharCode = currConfig.short;
            if (singleCharCode !== false) {
              if (orgText.charCodeAt(offset) === singleCharCode) {
                // single character string
                foundResyncPoint = true;
              }
            } else if (currConfig.isCustom === true) {
              foundResyncPoint =
                (currPattern as IRegExpExec).exec(
                  orgText,
                  offset,
                  matchedTokens,
                  groups,
                ) !== null;
            } else {
              this.updateLastIndex(currPattern as RegExp, offset);
              foundResyncPoint = (currPattern as RegExp).exec(text) !== null;
            }

            if (foundResyncPoint === true) {
              break;
            }
          }
        }

        errLength = offset - errorStartOffset;
        column = this.computeNewColumn(column!, errLength);
        // at this point we either re-synced or reached the end of the input text
        msg = this.config.errorMessageProvider.buildUnexpectedCharactersMessage(
          orgText,
          errorStartOffset,
          errLength,
          errorLine,
          errorColumn,
        );
        errors.push({
          offset: errorStartOffset,
          line: errorLine,
          column: errorColumn,
          length: errLength,
          message: msg,
        });

        if (recoveryEnabled === false) {
          break;
        }
      }
    }

    // if we do have custom patterns which push directly into the
    // TODO: custom tokens should not push directly??
    if (!this.hasCustom) {
      // if we guessed a too large size for the tokens array this will shrink it to the right size.
      matchedTokens.length = matchedTokensIndex;
    }

    return {
      tokens: matchedTokens,
      groups: groups,
      errors: errors,
    };
  }

  private handleModes(
    config: IPatternConfig,
    pop_mode: (tok: IToken) => void,
    push_mode: (this: Lexer, pushMode: string) => void,
    newToken: IToken,
  ) {
    if (config.pop === true) {
      // need to save the PUSH_MODE property as if the mode is popped
      // patternIdxToPopMode is updated to reflect the new mode after popping the stack
      const pushMode = config.push;
      pop_mode(newToken);
      if (pushMode !== undefined) {
        push_mode.call(this, pushMode);
      }
    } else if (config.push !== undefined) {
      push_mode.call(this, config.push);
    }
  }

  private chopInput(text: string, length: number): string {
    return text.substring(length);
  }

  private updateLastIndex(regExp: RegExp, newLastIndex: number): void {
    regExp.lastIndex = newLastIndex;
  }

  // TODO: decrease this under 600 characters? inspect stripping comments option in TSC compiler
  private updateTokenEndLineColumnLocation(
    newToken: IToken,
    group: string | false,
    lastLTIdx: number,
    numOfLTsInMatch: number,
    line: number,
    column: number,
    imageLength: number,
  ): void {
    let lastCharIsLT, fixForEndingInLT;
    if (group !== undefined) {
      // a none skipped multi line Token, need to update endLine/endColumn
      lastCharIsLT = lastLTIdx === imageLength - 1;
      fixForEndingInLT = lastCharIsLT ? -1 : 0;
      if (!(numOfLTsInMatch === 1 && lastCharIsLT === true)) {
        // if a token ends in a LT that last LT only affects the line numbering of following Tokens
        newToken.endLine = line + fixForEndingInLT;
        // the last LT in a token does not affect the endColumn either as the [columnStart ... columnEnd)
        // inclusive to exclusive range.
        newToken.endColumn = column - 1 + -fixForEndingInLT;
      }
      // else single LT in the last character of a token, no need to modify the endLine/EndColumn
    }
  }

  private computeNewColumn(oldColumn: number, imageLength: number) {
    return oldColumn + imageLength;
  }

  // Place holder, will be replaced by the correct variant according to the locationTracking option at runtime.
  /* istanbul ignore next - place holder */
  private createTokenInstance!: (...args: any[]) => IToken;

  private createOffsetOnlyToken(
    image: string,
    startOffset: number,
    tokenTypeIdx: number,
    tokenType: TokenType,
  ) {
    return {
      image,
      startOffset,
      tokenTypeIdx,
      tokenType,
    };
  }

  private createStartOnlyToken(
    image: string,
    startOffset: number,
    tokenTypeIdx: number,
    tokenType: TokenType,
    startLine: number,
    startColumn: number,
  ) {
    return {
      image,
      startOffset,
      startLine,
      startColumn,
      tokenTypeIdx,
      tokenType,
    };
  }

  private createFullToken(
    image: string,
    startOffset: number,
    tokenTypeIdx: number,
    tokenType: TokenType,
    startLine: number,
    startColumn: number,
    imageLength: number,
  ): IToken {
    return {
      image,
      startOffset,
      endOffset: startOffset + imageLength - 1,
      startLine,
      endLine: startLine,
      startColumn,
      endColumn: startColumn + imageLength - 1,
      tokenTypeIdx,
      tokenType,
    };
  }

  // Place holder, will be replaced by the correct variant according to the locationTracking option at runtime.
  /* istanbul ignore next - place holder */
  private addToken!: (
    tokenVector: IToken[],
    index: number,
    tokenToAdd: IToken,
  ) => number;

  private addTokenUsingPush(
    tokenVector: IToken[],
    index: number,
    tokenToAdd: IToken,
  ): number {
    tokenVector.push(tokenToAdd);
    return index;
  }

  private addTokenUsingMemberAccess(
    tokenVector: IToken[],
    index: number,
    tokenToAdd: IToken,
  ): number {
    tokenVector[index] = tokenToAdd;
    index++;
    return index;
  }

  // Place holder, will be replaced by the correct variant according to the hasCustom flag option at runtime.
  private handlePayload: (token: IToken, payload: any) => void;

  private handlePayloadNoCustom(token: IToken, payload: any): void {}

  private handlePayloadWithCustom(token: IToken, payload: any): void {
    if (payload !== null) {
      token.payload = payload;
    }
  }

  // place holder to be replaced with chosen alternative at runtime
  private match!: (
    pattern: RegExp,
    text: string,
    offset: number,
  ) => string | null;

  private matchWithTest(
    pattern: RegExp,
    text: string,
    offset: number,
  ): string | null {
    const found = pattern.test(text);
    if (found === true) {
      return text.substring(offset, pattern.lastIndex);
    }
    return null;
  }

  private matchWithExec(pattern: RegExp, text: string): string | null {
    const regExpArray = pattern.exec(text);
    return regExpArray !== null ? regExpArray[0] : null;
  }

  // Duplicated from the parser's perf trace trait to allow future extraction
  // of the lexer to a separate package.
  TRACE_INIT = <T>(phaseDesc: string, phaseImpl: () => T): T => {
    // No need to optimize this using NOOP pattern because
    // It is not called in a hot spot...
    if (this.traceInitPerf === true) {
      this.traceInitIndent++;
      const indent = new Array(this.traceInitIndent + 1).join("\t");
      if (this.traceInitIndent < this.traceInitMaxIdent) {
        console.log(`${indent}--> <${phaseDesc}>`);
      }
      const { time, value } = timer(phaseImpl);
      /* istanbul ignore next - Difficult to reproduce specific performance behavior (>10ms) in tests */
      const traceMethod = time > 10 ? console.warn : console.log;
      if (this.traceInitIndent < this.traceInitMaxIdent) {
        traceMethod(`${indent}<-- <${phaseDesc}> time: ${time}ms`);
      }
      this.traceInitIndent--;
      return value;
    } else {
      return phaseImpl();
    }
  };
}
