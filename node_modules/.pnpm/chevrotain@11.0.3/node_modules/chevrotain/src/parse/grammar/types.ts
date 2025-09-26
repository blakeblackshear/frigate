import {
  Alternation,
  IProductionWithOccurrence,
  NonTerminal,
  Rule,
  TokenType,
} from "@chevrotain/types";

export interface IParserDefinitionError {
  message: string;
  type: ParserDefinitionErrorType;
  ruleName?: string;
}

export declare enum ParserDefinitionErrorType {
  INVALID_RULE_NAME = 0,
  DUPLICATE_RULE_NAME = 1,
  INVALID_RULE_OVERRIDE = 2,
  DUPLICATE_PRODUCTIONS = 3,
  UNRESOLVED_SUBRULE_REF = 4,
  LEFT_RECURSION = 5,
  NONE_LAST_EMPTY_ALT = 6,
  AMBIGUOUS_ALTS = 7,
  CONFLICT_TOKENS_RULES_NAMESPACE = 8,
  INVALID_TOKEN_NAME = 9,
  NO_NON_EMPTY_LOOKAHEAD = 10,
  AMBIGUOUS_PREFIX_ALTS = 11,
  TOO_MANY_ALTS = 12,
  CUSTOM_LOOKAHEAD_VALIDATION = 13,
}

export interface IGrammarValidatorErrorMessageProvider {
  buildDuplicateFoundError(
    topLevelRule: Rule,
    duplicateProds: IProductionWithOccurrence[],
  ): string;
  buildNamespaceConflictError(topLevelRule: Rule): string;
  buildAlternationPrefixAmbiguityError(options: {
    topLevelRule: Rule;
    prefixPath: TokenType[];
    ambiguityIndices: number[];
    alternation: Alternation;
  }): string;
  buildAlternationAmbiguityError(options: {
    topLevelRule: Rule;
    prefixPath: TokenType[];
    ambiguityIndices: number[];
    alternation: Alternation;
  }): string;
  buildEmptyRepetitionError(options: {
    topLevelRule: Rule;
    repetition: IProductionWithOccurrence;
  }): string;
  /**
   * @deprecated - There are no longer constraints on Token names
   *               This method will be removed from the interface in future versions.
   *               Providing it will currently have no impact on the runtime.
   */
  buildTokenNameError(options: {
    tokenType: TokenType;
    expectedPattern: RegExp;
  }): any;

  buildEmptyAlternationError(options: {
    topLevelRule: Rule;
    alternation: Alternation;
    emptyChoiceIdx: number;
  }): any;
  buildTooManyAlternativesError(options: {
    topLevelRule: Rule;
    alternation: Alternation;
  }): string;
  buildLeftRecursionError(options: {
    topLevelRule: Rule;
    leftRecursionPath: Rule[];
  }): string;
  /**
   * @deprecated - There are no longer constraints on Rule names
   *               This method will be removed from the interface in future versions.
   *               Providing it will currently have no impact on the runtime.
   */
  buildInvalidRuleNameError(options: {
    topLevelRule: Rule;
    expectedPattern: RegExp;
  }): string;
  buildDuplicateRuleNameError(options: {
    topLevelRule: Rule | string;
    grammarName: string;
  }): string;
}

export interface IGrammarResolverErrorMessageProvider {
  buildRuleNotFoundError(
    topLevelRule: Rule,
    undefinedRule: NonTerminal,
  ): string;
}
