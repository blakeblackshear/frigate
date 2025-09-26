import { BaseRegExpVisitor } from "@chevrotain/regexp-to-ast";
import {
  IRegExpExec,
  Lexer,
  LexerDefinitionErrorType,
} from "./lexer_public.js";
import {
  compact,
  defaults,
  difference,
  filter,
  find,
  first,
  flatten,
  forEach,
  has,
  includes,
  indexOf,
  isArray,
  isEmpty,
  isFunction,
  isRegExp,
  isString,
  isUndefined,
  keys,
  map,
  reduce,
  reject,
  values,
} from "lodash-es";
import { PRINT_ERROR } from "@chevrotain/utils";
import {
  canMatchCharCode,
  failedOptimizationPrefixMsg,
  getOptimizedStartCodesIndices,
} from "./reg_exp.js";
import {
  ILexerDefinitionError,
  ILineTerminatorsTester,
  IMultiModeLexerDefinition,
  IToken,
  TokenType,
} from "@chevrotain/types";
import { getRegExpAst } from "./reg_exp_parser.js";

const PATTERN = "PATTERN";
export const DEFAULT_MODE = "defaultMode";
export const MODES = "modes";

export interface IPatternConfig {
  pattern: IRegExpExec | string;
  longerAlt: number[] | undefined;
  canLineTerminator: boolean;
  isCustom: boolean;
  short: number | false;
  group: string | undefined | false;
  push: string | undefined;
  pop: boolean;
  tokenType: TokenType;
  tokenTypeIdx: number;
}

export interface IAnalyzeResult {
  patternIdxToConfig: IPatternConfig[];
  charCodeToPatternIdxToConfig: { [charCode: number]: IPatternConfig[] };
  emptyGroups: { [groupName: string]: IToken[] };
  hasCustom: boolean;
  canBeOptimized: boolean;
}

export let SUPPORT_STICKY =
  typeof (<any>new RegExp("(?:)")).sticky === "boolean";

export function disableSticky() {
  SUPPORT_STICKY = false;
}

export function enableSticky() {
  SUPPORT_STICKY = true;
}

export function analyzeTokenTypes(
  tokenTypes: TokenType[],
  options: {
    positionTracking?: "full" | "onlyStart" | "onlyOffset";
    ensureOptimizations?: boolean;
    lineTerminatorCharacters?: (number | string)[];
    // TODO: should `useSticky` be an argument here?
    useSticky?: boolean;
    safeMode?: boolean;
    tracer?: (msg: string, action: () => void) => void;
  },
): IAnalyzeResult {
  options = defaults(options, {
    useSticky: SUPPORT_STICKY,
    debug: false as boolean,
    safeMode: false as boolean,
    positionTracking: "full",
    lineTerminatorCharacters: ["\r", "\n"],
    tracer: (msg: string, action: Function) => action(),
  });

  const tracer = options.tracer!;

  tracer("initCharCodeToOptimizedIndexMap", () => {
    initCharCodeToOptimizedIndexMap();
  });

  let onlyRelevantTypes: TokenType[];
  tracer("Reject Lexer.NA", () => {
    onlyRelevantTypes = reject(tokenTypes, (currType) => {
      return currType[PATTERN] === Lexer.NA;
    });
  });

  let hasCustom = false;
  let allTransformedPatterns: (IRegExpExec | string)[];
  tracer("Transform Patterns", () => {
    hasCustom = false;
    allTransformedPatterns = map(
      onlyRelevantTypes,
      (currType): IRegExpExec | string => {
        const currPattern = currType[PATTERN];

        /* istanbul ignore else */
        if (isRegExp(currPattern)) {
          const regExpSource = currPattern.source;
          if (
            regExpSource.length === 1 &&
            // only these regExp meta characters which can appear in a length one regExp
            regExpSource !== "^" &&
            regExpSource !== "$" &&
            regExpSource !== "." &&
            !currPattern.ignoreCase
          ) {
            return regExpSource;
          } else if (
            regExpSource.length === 2 &&
            regExpSource[0] === "\\" &&
            // not a meta character
            !includes(
              [
                "d",
                "D",
                "s",
                "S",
                "t",
                "r",
                "n",
                "t",
                "0",
                "c",
                "b",
                "B",
                "f",
                "v",
                "w",
                "W",
              ],
              regExpSource[1],
            )
          ) {
            // escaped meta Characters: /\+/ /\[/
            // or redundant escaping: /\a/
            // without the escaping "\"
            return regExpSource[1];
          } else {
            return options.useSticky
              ? addStickyFlag(currPattern)
              : addStartOfInput(currPattern);
          }
        } else if (isFunction(currPattern)) {
          hasCustom = true;
          // CustomPatternMatcherFunc - custom patterns do not require any transformations, only wrapping in a RegExp Like object
          return { exec: currPattern };
        } else if (typeof currPattern === "object") {
          hasCustom = true;
          // ICustomPattern
          return currPattern;
        } else if (typeof currPattern === "string") {
          if (currPattern.length === 1) {
            return currPattern;
          } else {
            const escapedRegExpString = currPattern.replace(
              /[\\^$.*+?()[\]{}|]/g,
              "\\$&",
            );
            const wrappedRegExp = new RegExp(escapedRegExpString);
            return options.useSticky
              ? addStickyFlag(wrappedRegExp)
              : addStartOfInput(wrappedRegExp);
          }
        } else {
          throw Error("non exhaustive match");
        }
      },
    );
  });

  let patternIdxToType: number[];
  let patternIdxToGroup: (string | undefined | false)[];
  let patternIdxToLongerAltIdxArr: (number[] | undefined)[];
  let patternIdxToPushMode: (string | undefined)[];
  let patternIdxToPopMode: boolean[];
  tracer("misc mapping", () => {
    patternIdxToType = map(
      onlyRelevantTypes,
      (currType) => currType.tokenTypeIdx!,
    );

    patternIdxToGroup = map(onlyRelevantTypes, (clazz: any) => {
      const groupName = clazz.GROUP;
      /* istanbul ignore next */
      if (groupName === Lexer.SKIPPED) {
        return undefined;
      } else if (isString(groupName)) {
        return groupName;
      } else if (isUndefined(groupName)) {
        return false;
      } else {
        throw Error("non exhaustive match");
      }
    });

    patternIdxToLongerAltIdxArr = map(onlyRelevantTypes, (clazz: any) => {
      const longerAltType = clazz.LONGER_ALT;

      if (longerAltType) {
        const longerAltIdxArr = isArray(longerAltType)
          ? map(longerAltType, (type: any) => indexOf(onlyRelevantTypes, type))
          : [indexOf(onlyRelevantTypes, longerAltType)];
        return longerAltIdxArr;
      }
    });

    patternIdxToPushMode = map(
      onlyRelevantTypes,
      (clazz: any) => clazz.PUSH_MODE,
    );

    patternIdxToPopMode = map(onlyRelevantTypes, (clazz: any) =>
      has(clazz, "POP_MODE"),
    );
  });

  let patternIdxToCanLineTerminator: boolean[];
  tracer("Line Terminator Handling", () => {
    const lineTerminatorCharCodes = getCharCodes(
      options.lineTerminatorCharacters!,
    );
    patternIdxToCanLineTerminator = map(onlyRelevantTypes, (tokType) => false);
    if (options.positionTracking !== "onlyOffset") {
      patternIdxToCanLineTerminator = map(onlyRelevantTypes, (tokType) => {
        if (has(tokType, "LINE_BREAKS")) {
          return !!tokType.LINE_BREAKS;
        } else {
          return (
            checkLineBreaksIssues(tokType, lineTerminatorCharCodes) === false &&
            canMatchCharCode(
              lineTerminatorCharCodes,
              tokType.PATTERN as RegExp | string,
            )
          );
        }
      });
    }
  });

  let patternIdxToIsCustom: boolean[];
  let patternIdxToShort: (number | false)[];
  let emptyGroups!: { [groupName: string]: IToken[] };
  let patternIdxToConfig!: IPatternConfig[];
  tracer("Misc Mapping #2", () => {
    patternIdxToIsCustom = map(onlyRelevantTypes, isCustomPattern);
    patternIdxToShort = map(allTransformedPatterns, isShortPattern);

    emptyGroups = reduce(
      onlyRelevantTypes,
      (acc, clazz: any) => {
        const groupName = clazz.GROUP;
        if (isString(groupName) && !(groupName === Lexer.SKIPPED)) {
          acc[groupName] = [];
        }
        return acc;
      },
      {} as { [groupName: string]: IToken[] },
    );

    patternIdxToConfig = map(
      allTransformedPatterns,
      (x, idx): IPatternConfig => {
        return {
          pattern: allTransformedPatterns[idx],
          longerAlt: patternIdxToLongerAltIdxArr[idx],
          canLineTerminator: patternIdxToCanLineTerminator[idx],
          isCustom: patternIdxToIsCustom[idx],
          short: patternIdxToShort[idx],
          group: patternIdxToGroup[idx],
          push: patternIdxToPushMode[idx],
          pop: patternIdxToPopMode[idx],
          tokenTypeIdx: patternIdxToType[idx],
          tokenType: onlyRelevantTypes[idx],
        };
      },
    );
  });

  let canBeOptimized = true;
  let charCodeToPatternIdxToConfig: { [charCode: number]: IPatternConfig[] } =
    [];

  if (!options.safeMode) {
    tracer("First Char Optimization", () => {
      charCodeToPatternIdxToConfig = reduce(
        onlyRelevantTypes,
        (result, currTokType, idx) => {
          if (typeof currTokType.PATTERN === "string") {
            const charCode = currTokType.PATTERN.charCodeAt(0);
            const optimizedIdx = charCodeToOptimizedIndex(charCode);
            addToMapOfArrays(result, optimizedIdx, patternIdxToConfig[idx]);
          } else if (isArray(currTokType.START_CHARS_HINT)) {
            let lastOptimizedIdx: number;
            forEach(currTokType.START_CHARS_HINT, (charOrInt) => {
              const charCode =
                typeof charOrInt === "string"
                  ? charOrInt.charCodeAt(0)
                  : charOrInt;
              const currOptimizedIdx = charCodeToOptimizedIndex(charCode);
              // Avoid adding the config multiple times
              /* istanbul ignore else */
              // - Difficult to check this scenario effects as it is only a performance
              //   optimization that does not change correctness
              if (lastOptimizedIdx !== currOptimizedIdx) {
                lastOptimizedIdx = currOptimizedIdx;
                addToMapOfArrays(
                  result,
                  currOptimizedIdx,
                  patternIdxToConfig[idx],
                );
              }
            });
          } else if (isRegExp(currTokType.PATTERN)) {
            if (currTokType.PATTERN.unicode) {
              canBeOptimized = false;
              if (options.ensureOptimizations) {
                PRINT_ERROR(
                  `${failedOptimizationPrefixMsg}` +
                    `\tUnable to analyze < ${currTokType.PATTERN.toString()} > pattern.\n` +
                    "\tThe regexp unicode flag is not currently supported by the regexp-to-ast library.\n" +
                    "\tThis will disable the lexer's first char optimizations.\n" +
                    "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNICODE_OPTIMIZE",
                );
              }
            } else {
              const optimizedCodes = getOptimizedStartCodesIndices(
                currTokType.PATTERN,
                options.ensureOptimizations,
              );
              /* istanbul ignore if */
              // start code will only be empty given an empty regExp or failure of regexp-to-ast library
              // the first should be a different validation and the second cannot be tested.
              if (isEmpty(optimizedCodes)) {
                // we cannot understand what codes may start possible matches
                // The optimization correctness requires knowing start codes for ALL patterns.
                // Not actually sure this is an error, no debug message
                canBeOptimized = false;
              }
              forEach(optimizedCodes, (code) => {
                addToMapOfArrays(result, code, patternIdxToConfig[idx]);
              });
            }
          } else {
            if (options.ensureOptimizations) {
              PRINT_ERROR(
                `${failedOptimizationPrefixMsg}` +
                  `\tTokenType: <${currTokType.name}> is using a custom token pattern without providing <start_chars_hint> parameter.\n` +
                  "\tThis will disable the lexer's first char optimizations.\n" +
                  "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_OPTIMIZE",
              );
            }
            canBeOptimized = false;
          }

          return result;
        },
        [] as { [charCode: number]: IPatternConfig[] },
      );
    });
  }

  return {
    emptyGroups: emptyGroups,
    patternIdxToConfig: patternIdxToConfig,
    charCodeToPatternIdxToConfig: charCodeToPatternIdxToConfig,
    hasCustom: hasCustom,
    canBeOptimized: canBeOptimized,
  };
}

export function validatePatterns(
  tokenTypes: TokenType[],
  validModesNames: string[],
): ILexerDefinitionError[] {
  let errors: ILexerDefinitionError[] = [];

  const missingResult = findMissingPatterns(tokenTypes);
  errors = errors.concat(missingResult.errors);

  const invalidResult = findInvalidPatterns(missingResult.valid);
  const validTokenTypes = invalidResult.valid;
  errors = errors.concat(invalidResult.errors);

  errors = errors.concat(validateRegExpPattern(validTokenTypes));

  errors = errors.concat(findInvalidGroupType(validTokenTypes));

  errors = errors.concat(
    findModesThatDoNotExist(validTokenTypes, validModesNames),
  );

  errors = errors.concat(findUnreachablePatterns(validTokenTypes));

  return errors;
}

function validateRegExpPattern(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  let errors: ILexerDefinitionError[] = [];
  const withRegExpPatterns = filter(tokenTypes, (currTokType) =>
    isRegExp(currTokType[PATTERN]),
  );

  errors = errors.concat(findEndOfInputAnchor(withRegExpPatterns));

  errors = errors.concat(findStartOfInputAnchor(withRegExpPatterns));

  errors = errors.concat(findUnsupportedFlags(withRegExpPatterns));

  errors = errors.concat(findDuplicatePatterns(withRegExpPatterns));

  errors = errors.concat(findEmptyMatchRegExps(withRegExpPatterns));

  return errors;
}

export interface ILexerFilterResult {
  errors: ILexerDefinitionError[];
  valid: TokenType[];
}

export function findMissingPatterns(
  tokenTypes: TokenType[],
): ILexerFilterResult {
  const tokenTypesWithMissingPattern = filter(tokenTypes, (currType) => {
    return !has(currType, PATTERN);
  });

  const errors = map(tokenTypesWithMissingPattern, (currType) => {
    return {
      message:
        "Token Type: ->" +
        currType.name +
        "<- missing static 'PATTERN' property",
      type: LexerDefinitionErrorType.MISSING_PATTERN,
      tokenTypes: [currType],
    };
  });

  const valid = difference(tokenTypes, tokenTypesWithMissingPattern);
  return { errors, valid };
}

export function findInvalidPatterns(
  tokenTypes: TokenType[],
): ILexerFilterResult {
  const tokenTypesWithInvalidPattern = filter(tokenTypes, (currType) => {
    const pattern = currType[PATTERN];
    return (
      !isRegExp(pattern) &&
      !isFunction(pattern) &&
      !has(pattern, "exec") &&
      !isString(pattern)
    );
  });

  const errors = map(tokenTypesWithInvalidPattern, (currType) => {
    return {
      message:
        "Token Type: ->" +
        currType.name +
        "<- static 'PATTERN' can only be a RegExp, a" +
        " Function matching the {CustomPatternMatcherFunc} type or an Object matching the {ICustomPattern} interface.",
      type: LexerDefinitionErrorType.INVALID_PATTERN,
      tokenTypes: [currType],
    };
  });

  const valid = difference(tokenTypes, tokenTypesWithInvalidPattern);
  return { errors, valid };
}

const end_of_input = /[^\\][$]/;

export function findEndOfInputAnchor(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  class EndAnchorFinder extends BaseRegExpVisitor {
    found = false;

    visitEndAnchor(node: unknown) {
      this.found = true;
    }
  }

  const invalidRegex = filter(tokenTypes, (currType) => {
    const pattern = currType.PATTERN;

    try {
      const regexpAst = getRegExpAst(pattern as RegExp);
      const endAnchorVisitor = new EndAnchorFinder();
      endAnchorVisitor.visit(regexpAst);

      return endAnchorVisitor.found;
    } catch (e) {
      // old behavior in case of runtime exceptions with regexp-to-ast.
      /* istanbul ignore next - cannot ensure an error in regexp-to-ast*/
      return end_of_input.test((pattern as RegExp).source);
    }
  });

  const errors = map(invalidRegex, (currType) => {
    return {
      message:
        "Unexpected RegExp Anchor Error:\n" +
        "\tToken Type: ->" +
        currType.name +
        "<- static 'PATTERN' cannot contain end of input anchor '$'\n" +
        "\tSee chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS" +
        "\tfor details.",
      type: LexerDefinitionErrorType.EOI_ANCHOR_FOUND,
      tokenTypes: [currType],
    };
  });

  return errors;
}

export function findEmptyMatchRegExps(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  const matchesEmptyString = filter(tokenTypes, (currType) => {
    const pattern = currType.PATTERN as RegExp;
    return pattern.test("");
  });

  const errors = map(matchesEmptyString, (currType) => {
    return {
      message:
        "Token Type: ->" +
        currType.name +
        "<- static 'PATTERN' must not match an empty string",
      type: LexerDefinitionErrorType.EMPTY_MATCH_PATTERN,
      tokenTypes: [currType],
    };
  });

  return errors;
}

const start_of_input = /[^\\[][\^]|^\^/;

export function findStartOfInputAnchor(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  class StartAnchorFinder extends BaseRegExpVisitor {
    found = false;

    visitStartAnchor(node: unknown) {
      this.found = true;
    }
  }

  const invalidRegex = filter(tokenTypes, (currType) => {
    const pattern = currType.PATTERN as RegExp;
    try {
      const regexpAst = getRegExpAst(pattern);
      const startAnchorVisitor = new StartAnchorFinder();
      startAnchorVisitor.visit(regexpAst);

      return startAnchorVisitor.found;
    } catch (e) {
      // old behavior in case of runtime exceptions with regexp-to-ast.
      /* istanbul ignore next - cannot ensure an error in regexp-to-ast*/
      return start_of_input.test(pattern.source);
    }
  });

  const errors = map(invalidRegex, (currType) => {
    return {
      message:
        "Unexpected RegExp Anchor Error:\n" +
        "\tToken Type: ->" +
        currType.name +
        "<- static 'PATTERN' cannot contain start of input anchor '^'\n" +
        "\tSee https://chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS" +
        "\tfor details.",
      type: LexerDefinitionErrorType.SOI_ANCHOR_FOUND,
      tokenTypes: [currType],
    };
  });

  return errors;
}

export function findUnsupportedFlags(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  const invalidFlags = filter(tokenTypes, (currType) => {
    const pattern = currType[PATTERN];
    return pattern instanceof RegExp && (pattern.multiline || pattern.global);
  });

  const errors = map(invalidFlags, (currType) => {
    return {
      message:
        "Token Type: ->" +
        currType.name +
        "<- static 'PATTERN' may NOT contain global('g') or multiline('m')",
      type: LexerDefinitionErrorType.UNSUPPORTED_FLAGS_FOUND,
      tokenTypes: [currType],
    };
  });

  return errors;
}

// This can only test for identical duplicate RegExps, not semantically equivalent ones.
export function findDuplicatePatterns(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  const found: TokenType[] = [];
  let identicalPatterns = map(tokenTypes, (outerType: any) => {
    return reduce(
      tokenTypes,
      (result, innerType) => {
        if (
          outerType.PATTERN.source === (innerType.PATTERN as RegExp).source &&
          !includes(found, innerType) &&
          innerType.PATTERN !== Lexer.NA
        ) {
          // this avoids duplicates in the result, each Token Type may only appear in one "set"
          // in essence we are creating Equivalence classes on equality relation.
          found.push(innerType);
          result.push(innerType);
          return result;
        }
        return result;
      },
      [] as TokenType[],
    );
  });

  identicalPatterns = compact(identicalPatterns);

  const duplicatePatterns = filter(identicalPatterns, (currIdenticalSet) => {
    return currIdenticalSet.length > 1;
  });

  const errors = map(duplicatePatterns, (setOfIdentical: any) => {
    const tokenTypeNames = map(setOfIdentical, (currType: any) => {
      return currType.name;
    });

    const dupPatternSrc = (<any>first(setOfIdentical)).PATTERN;
    return {
      message:
        `The same RegExp pattern ->${dupPatternSrc}<-` +
        `has been used in all of the following Token Types: ${tokenTypeNames.join(
          ", ",
        )} <-`,
      type: LexerDefinitionErrorType.DUPLICATE_PATTERNS_FOUND,
      tokenTypes: setOfIdentical,
    };
  });

  return errors;
}

export function findInvalidGroupType(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  const invalidTypes = filter(tokenTypes, (clazz: any) => {
    if (!has(clazz, "GROUP")) {
      return false;
    }
    const group = clazz.GROUP;

    return group !== Lexer.SKIPPED && group !== Lexer.NA && !isString(group);
  });

  const errors = map(invalidTypes, (currType) => {
    return {
      message:
        "Token Type: ->" +
        currType.name +
        "<- static 'GROUP' can only be Lexer.SKIPPED/Lexer.NA/A String",
      type: LexerDefinitionErrorType.INVALID_GROUP_TYPE_FOUND,
      tokenTypes: [currType],
    };
  });

  return errors;
}

export function findModesThatDoNotExist(
  tokenTypes: TokenType[],
  validModes: string[],
): ILexerDefinitionError[] {
  const invalidModes = filter(tokenTypes, (clazz: any) => {
    return (
      clazz.PUSH_MODE !== undefined && !includes(validModes, clazz.PUSH_MODE)
    );
  });

  const errors = map(invalidModes, (tokType) => {
    const msg =
      `Token Type: ->${tokType.name}<- static 'PUSH_MODE' value cannot refer to a Lexer Mode ->${tokType.PUSH_MODE}<-` +
      `which does not exist`;
    return {
      message: msg,
      type: LexerDefinitionErrorType.PUSH_MODE_DOES_NOT_EXIST,
      tokenTypes: [tokType],
    };
  });

  return errors;
}

export function findUnreachablePatterns(
  tokenTypes: TokenType[],
): ILexerDefinitionError[] {
  const errors: ILexerDefinitionError[] = [];

  const canBeTested = reduce(
    tokenTypes,
    (result, tokType, idx) => {
      const pattern = tokType.PATTERN;

      if (pattern === Lexer.NA) {
        return result;
      }

      // a more comprehensive validation for all forms of regExps would require
      // deeper regExp analysis capabilities
      if (isString(pattern)) {
        result.push({ str: pattern, idx, tokenType: tokType });
      } else if (isRegExp(pattern) && noMetaChar(pattern)) {
        result.push({ str: pattern.source, idx, tokenType: tokType });
      }
      return result;
    },
    [] as { str: string; idx: number; tokenType: TokenType }[],
  );

  forEach(tokenTypes, (tokType, testIdx) => {
    forEach(canBeTested, ({ str, idx, tokenType }) => {
      if (testIdx < idx && testTokenType(str, tokType.PATTERN)) {
        const msg =
          `Token: ->${tokenType.name}<- can never be matched.\n` +
          `Because it appears AFTER the Token Type ->${tokType.name}<-` +
          `in the lexer's definition.\n` +
          `See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNREACHABLE`;
        errors.push({
          message: msg,
          type: LexerDefinitionErrorType.UNREACHABLE_PATTERN,
          tokenTypes: [tokType, tokenType],
        });
      }
    });
  });

  return errors;
}

function testTokenType(str: string, pattern: any): boolean {
  /* istanbul ignore else */
  if (isRegExp(pattern)) {
    const regExpArray = pattern.exec(str);
    return regExpArray !== null && regExpArray.index === 0;
  } else if (isFunction(pattern)) {
    // maintain the API of custom patterns
    return pattern(str, 0, [], {});
  } else if (has(pattern, "exec")) {
    // maintain the API of custom patterns
    return pattern.exec(str, 0, [], {});
  } else if (typeof pattern === "string") {
    return pattern === str;
  } else {
    throw Error("non exhaustive match");
  }
}

function noMetaChar(regExp: RegExp): boolean {
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
  const metaChars = [
    ".",
    "\\",
    "[",
    "]",
    "|",
    "^",
    "$",
    "(",
    ")",
    "?",
    "*",
    "+",
    "{",
  ];
  return (
    find(metaChars, (char) => regExp.source.indexOf(char) !== -1) === undefined
  );
}

export function addStartOfInput(pattern: RegExp): RegExp {
  const flags = pattern.ignoreCase ? "i" : "";
  // always wrapping in a none capturing group preceded by '^' to make sure matching can only work on start of input.
  // duplicate/redundant start of input markers have no meaning (/^^^^A/ === /^A/)
  return new RegExp(`^(?:${pattern.source})`, flags);
}

export function addStickyFlag(pattern: RegExp): RegExp {
  const flags = pattern.ignoreCase ? "iy" : "y";
  // always wrapping in a none capturing group preceded by '^' to make sure matching can only work on start of input.
  // duplicate/redundant start of input markers have no meaning (/^^^^A/ === /^A/)
  return new RegExp(`${pattern.source}`, flags);
}

export function performRuntimeChecks(
  lexerDefinition: IMultiModeLexerDefinition,
  trackLines: boolean,
  lineTerminatorCharacters: (number | string)[],
): ILexerDefinitionError[] {
  const errors: ILexerDefinitionError[] = [];

  // some run time checks to help the end users.
  if (!has(lexerDefinition, DEFAULT_MODE)) {
    errors.push({
      message:
        "A MultiMode Lexer cannot be initialized without a <" +
        DEFAULT_MODE +
        "> property in its definition\n",
      type: LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE,
    });
  }
  if (!has(lexerDefinition, MODES)) {
    errors.push({
      message:
        "A MultiMode Lexer cannot be initialized without a <" +
        MODES +
        "> property in its definition\n",
      type: LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY,
    });
  }

  if (
    has(lexerDefinition, MODES) &&
    has(lexerDefinition, DEFAULT_MODE) &&
    !has(lexerDefinition.modes, lexerDefinition.defaultMode)
  ) {
    errors.push({
      message:
        `A MultiMode Lexer cannot be initialized with a ${DEFAULT_MODE}: <${lexerDefinition.defaultMode}>` +
        `which does not exist\n`,
      type: LexerDefinitionErrorType.MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST,
    });
  }

  if (has(lexerDefinition, MODES)) {
    forEach(lexerDefinition.modes, (currModeValue, currModeName) => {
      forEach(currModeValue, (currTokType, currIdx) => {
        if (isUndefined(currTokType)) {
          errors.push({
            message:
              `A Lexer cannot be initialized using an undefined Token Type. Mode:` +
              `<${currModeName}> at index: <${currIdx}>\n`,
            type: LexerDefinitionErrorType.LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED,
          });
        } else if (has(currTokType, "LONGER_ALT")) {
          const longerAlt = isArray(currTokType.LONGER_ALT)
            ? currTokType.LONGER_ALT
            : [currTokType.LONGER_ALT];
          forEach(longerAlt, (currLongerAlt) => {
            if (
              !isUndefined(currLongerAlt) &&
              !includes(currModeValue, currLongerAlt)
            ) {
              errors.push({
                message: `A MultiMode Lexer cannot be initialized with a longer_alt <${currLongerAlt.name}> on token <${currTokType.name}> outside of mode <${currModeName}>\n`,
                type: LexerDefinitionErrorType.MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE,
              });
            }
          });
        }
      });
    });
  }

  return errors;
}

export function performWarningRuntimeChecks(
  lexerDefinition: IMultiModeLexerDefinition,
  trackLines: boolean,
  lineTerminatorCharacters: (number | string)[],
): ILexerDefinitionError[] {
  const warnings = [];
  let hasAnyLineBreak = false;
  const allTokenTypes = compact(flatten(values(lexerDefinition.modes)));

  const concreteTokenTypes = reject(
    allTokenTypes,
    (currType) => currType[PATTERN] === Lexer.NA,
  );
  const terminatorCharCodes = getCharCodes(lineTerminatorCharacters);
  if (trackLines) {
    forEach(concreteTokenTypes, (tokType) => {
      const currIssue = checkLineBreaksIssues(tokType, terminatorCharCodes);
      if (currIssue !== false) {
        const message = buildLineBreakIssueMessage(tokType, currIssue);
        const warningDescriptor = {
          message,
          type: currIssue.issue,
          tokenType: tokType,
        };
        warnings.push(warningDescriptor);
      } else {
        // we don't want to attempt to scan if the user explicitly specified the line_breaks option.
        if (has(tokType, "LINE_BREAKS")) {
          if (tokType.LINE_BREAKS === true) {
            hasAnyLineBreak = true;
          }
        } else {
          if (
            canMatchCharCode(terminatorCharCodes, tokType.PATTERN as RegExp)
          ) {
            hasAnyLineBreak = true;
          }
        }
      }
    });
  }

  if (trackLines && !hasAnyLineBreak) {
    warnings.push({
      message:
        "Warning: No LINE_BREAKS Found.\n" +
        "\tThis Lexer has been defined to track line and column information,\n" +
        "\tBut none of the Token Types can be identified as matching a line terminator.\n" +
        "\tSee https://chevrotain.io/docs/guide/resolving_lexer_errors.html#LINE_BREAKS \n" +
        "\tfor details.",
      type: LexerDefinitionErrorType.NO_LINE_BREAKS_FLAGS,
    });
  }
  return warnings;
}

export function cloneEmptyGroups(emptyGroups: {
  [groupName: string]: IToken;
}): { [groupName: string]: IToken } {
  const clonedResult: any = {};
  const groupKeys = keys(emptyGroups);

  forEach(groupKeys, (currKey) => {
    const currGroupValue = emptyGroups[currKey];

    /* istanbul ignore else */
    if (isArray(currGroupValue)) {
      clonedResult[currKey] = [];
    } else {
      throw Error("non exhaustive match");
    }
  });

  return clonedResult;
}

// TODO: refactor to avoid duplication
export function isCustomPattern(tokenType: TokenType): boolean {
  const pattern = tokenType.PATTERN;
  /* istanbul ignore else */
  if (isRegExp(pattern)) {
    return false;
  } else if (isFunction(pattern)) {
    // CustomPatternMatcherFunc - custom patterns do not require any transformations, only wrapping in a RegExp Like object
    return true;
  } else if (has(pattern, "exec")) {
    // ICustomPattern
    return true;
  } else if (isString(pattern)) {
    return false;
  } else {
    throw Error("non exhaustive match");
  }
}

export function isShortPattern(pattern: any): number | false {
  if (isString(pattern) && pattern.length === 1) {
    return pattern.charCodeAt(0);
  } else {
    return false;
  }
}

/**
 * Faster than using a RegExp for default newline detection during lexing.
 */
export const LineTerminatorOptimizedTester: ILineTerminatorsTester = {
  // implements /\n|\r\n?/g.test
  test: function (text) {
    const len = text.length;
    for (let i = this.lastIndex; i < len; i++) {
      const c = text.charCodeAt(i);
      if (c === 10) {
        this.lastIndex = i + 1;
        return true;
      } else if (c === 13) {
        if (text.charCodeAt(i + 1) === 10) {
          this.lastIndex = i + 2;
        } else {
          this.lastIndex = i + 1;
        }
        return true;
      }
    }
    return false;
  },

  lastIndex: 0,
};

function checkLineBreaksIssues(
  tokType: TokenType,
  lineTerminatorCharCodes: number[],
):
  | {
      issue:
        | LexerDefinitionErrorType.IDENTIFY_TERMINATOR
        | LexerDefinitionErrorType.CUSTOM_LINE_BREAK;
      errMsg?: string;
    }
  | false {
  if (has(tokType, "LINE_BREAKS")) {
    // if the user explicitly declared the line_breaks option we will respect their choice
    // and assume it is correct.
    return false;
  } else {
    /* istanbul ignore else */
    if (isRegExp(tokType.PATTERN)) {
      try {
        // TODO: why is the casting suddenly needed?
        canMatchCharCode(lineTerminatorCharCodes, tokType.PATTERN as RegExp);
      } catch (e) {
        /* istanbul ignore next - to test this we would have to mock <canMatchCharCode> to throw an error */
        return {
          issue: LexerDefinitionErrorType.IDENTIFY_TERMINATOR,
          errMsg: (e as Error).message,
        };
      }
      return false;
    } else if (isString(tokType.PATTERN)) {
      // string literal patterns can always be analyzed to detect line terminator usage
      return false;
    } else if (isCustomPattern(tokType)) {
      // custom token types
      return { issue: LexerDefinitionErrorType.CUSTOM_LINE_BREAK };
    } else {
      throw Error("non exhaustive match");
    }
  }
}

export function buildLineBreakIssueMessage(
  tokType: TokenType,
  details: {
    issue:
      | LexerDefinitionErrorType.IDENTIFY_TERMINATOR
      | LexerDefinitionErrorType.CUSTOM_LINE_BREAK;
    errMsg?: string;
  },
): string {
  /* istanbul ignore else */
  if (details.issue === LexerDefinitionErrorType.IDENTIFY_TERMINATOR) {
    return (
      "Warning: unable to identify line terminator usage in pattern.\n" +
      `\tThe problem is in the <${tokType.name}> Token Type\n` +
      `\t Root cause: ${details.errMsg}.\n` +
      "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#IDENTIFY_TERMINATOR"
    );
  } else if (details.issue === LexerDefinitionErrorType.CUSTOM_LINE_BREAK) {
    return (
      "Warning: A Custom Token Pattern should specify the <line_breaks> option.\n" +
      `\tThe problem is in the <${tokType.name}> Token Type\n` +
      "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_LINE_BREAK"
    );
  } else {
    throw Error("non exhaustive match");
  }
}

function getCharCodes(charsOrCodes: (number | string)[]): number[] {
  const charCodes = map(charsOrCodes, (numOrString) => {
    if (isString(numOrString)) {
      return numOrString.charCodeAt(0);
    } else {
      return numOrString;
    }
  });

  return charCodes;
}

function addToMapOfArrays<T>(
  map: Record<number, T[]>,
  key: number,
  value: T,
): void {
  if (map[key] === undefined) {
    map[key] = [value];
  } else {
    map[key].push(value);
  }
}

export const minOptimizationVal = 256;

/**
 * We are mapping charCode above ASCI (256) into buckets each in the size of 256.
 * This is because ASCI are the most common start chars so each one of those will get its own
 * possible token configs vector.
 *
 * Tokens starting with charCodes "above" ASCI are uncommon, so we can "afford"
 * to place these into buckets of possible token configs, What we gain from
 * this is avoiding the case of creating an optimization 'charCodeToPatternIdxToConfig'
 * which would contain 10,000+ arrays of small size (e.g unicode Identifiers scenario).
 * Our 'charCodeToPatternIdxToConfig' max size will now be:
 * 256 + (2^16 / 2^8) - 1 === 511
 *
 * note the hack for fast division integer part extraction
 * See: https://stackoverflow.com/a/4228528
 */
let charCodeToOptimizedIdxMap: number[] = [];
export function charCodeToOptimizedIndex(charCode: number): number {
  return charCode < minOptimizationVal
    ? charCode
    : charCodeToOptimizedIdxMap[charCode];
}

/**
 * This is a compromise between cold start / hot running performance
 * Creating this array takes ~3ms on a modern machine,
 * But if we perform the computation at runtime as needed the CSS Lexer benchmark
 * performance degrades by ~10%
 *
 * TODO: Perhaps it should be lazy initialized only if a charCode > 255 is used.
 */
function initCharCodeToOptimizedIndexMap() {
  if (isEmpty(charCodeToOptimizedIdxMap)) {
    charCodeToOptimizedIdxMap = new Array(65536);
    for (let i = 0; i < 65536; i++) {
      charCodeToOptimizedIdxMap[i] = i > 255 ? 255 + ~~(i / 255) : i;
    }
  }
}
