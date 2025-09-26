import {
  ILookaheadStrategy,
  ILookaheadValidationError,
  IOrAlt,
  OptionalProductionType,
  Rule,
  TokenType,
} from "@chevrotain/types";
import { flatMap, isEmpty } from "lodash-es";
import { defaultGrammarValidatorErrorProvider } from "../errors_public.js";
import { DEFAULT_PARSER_CONFIG } from "../parser/parser.js";
import {
  validateAmbiguousAlternationAlternatives,
  validateEmptyOrAlternative,
  validateNoLeftRecursion,
  validateSomeNonEmptyLookaheadPath,
} from "./checks.js";
import {
  buildAlternativesLookAheadFunc,
  buildLookaheadFuncForOptionalProd,
  buildLookaheadFuncForOr,
  buildSingleAlternativeLookaheadFunction,
  getProdType,
} from "./lookahead.js";
import { IParserDefinitionError } from "./types.js";

export class LLkLookaheadStrategy implements ILookaheadStrategy {
  readonly maxLookahead: number;

  constructor(options?: { maxLookahead?: number }) {
    this.maxLookahead =
      options?.maxLookahead ?? DEFAULT_PARSER_CONFIG.maxLookahead;
  }

  validate(options: {
    rules: Rule[];
    tokenTypes: TokenType[];
    grammarName: string;
  }): ILookaheadValidationError[] {
    const leftRecursionErrors = this.validateNoLeftRecursion(options.rules);

    if (isEmpty(leftRecursionErrors)) {
      const emptyAltErrors = this.validateEmptyOrAlternatives(options.rules);
      const ambiguousAltsErrors = this.validateAmbiguousAlternationAlternatives(
        options.rules,
        this.maxLookahead,
      );
      const emptyRepetitionErrors = this.validateSomeNonEmptyLookaheadPath(
        options.rules,
        this.maxLookahead,
      );
      const allErrors = [
        ...leftRecursionErrors,
        ...emptyAltErrors,
        ...ambiguousAltsErrors,
        ...emptyRepetitionErrors,
      ];
      return allErrors;
    }
    return leftRecursionErrors;
  }

  validateNoLeftRecursion(rules: Rule[]): IParserDefinitionError[] {
    return flatMap(rules, (currTopRule) =>
      validateNoLeftRecursion(
        currTopRule,
        currTopRule,
        defaultGrammarValidatorErrorProvider,
      ),
    );
  }

  validateEmptyOrAlternatives(rules: Rule[]): IParserDefinitionError[] {
    return flatMap(rules, (currTopRule) =>
      validateEmptyOrAlternative(
        currTopRule,
        defaultGrammarValidatorErrorProvider,
      ),
    );
  }

  validateAmbiguousAlternationAlternatives(
    rules: Rule[],
    maxLookahead: number,
  ): IParserDefinitionError[] {
    return flatMap(rules, (currTopRule) =>
      validateAmbiguousAlternationAlternatives(
        currTopRule,
        maxLookahead,
        defaultGrammarValidatorErrorProvider,
      ),
    );
  }

  validateSomeNonEmptyLookaheadPath(
    rules: Rule[],
    maxLookahead: number,
  ): IParserDefinitionError[] {
    return validateSomeNonEmptyLookaheadPath(
      rules,
      maxLookahead,
      defaultGrammarValidatorErrorProvider,
    );
  }

  buildLookaheadForAlternation(options: {
    prodOccurrence: number;
    rule: Rule;
    maxLookahead: number;
    hasPredicates: boolean;
    dynamicTokensEnabled: boolean;
  }): (orAlts?: IOrAlt<any>[] | undefined) => number | undefined {
    return buildLookaheadFuncForOr(
      options.prodOccurrence,
      options.rule,
      options.maxLookahead,
      options.hasPredicates,
      options.dynamicTokensEnabled,
      buildAlternativesLookAheadFunc,
    );
  }

  buildLookaheadForOptional(options: {
    prodOccurrence: number;
    prodType: OptionalProductionType;
    rule: Rule;
    maxLookahead: number;
    dynamicTokensEnabled: boolean;
  }): () => boolean {
    return buildLookaheadFuncForOptionalProd(
      options.prodOccurrence,
      options.rule,
      options.maxLookahead,
      options.dynamicTokensEnabled,
      getProdType(options.prodType),
      buildSingleAlternativeLookaheadFunction,
    );
  }
}
