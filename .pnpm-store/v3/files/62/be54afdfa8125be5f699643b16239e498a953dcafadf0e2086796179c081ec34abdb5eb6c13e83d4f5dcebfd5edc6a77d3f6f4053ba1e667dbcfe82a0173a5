import { forEach, has } from "lodash-es";
import { DEFAULT_PARSER_CONFIG } from "../parser.js";
import {
  ILookaheadStrategy,
  IParserConfig,
  OptionalProductionType,
} from "@chevrotain/types";
import {
  AT_LEAST_ONE_IDX,
  AT_LEAST_ONE_SEP_IDX,
  getKeyForAutomaticLookahead,
  MANY_IDX,
  MANY_SEP_IDX,
  OPTION_IDX,
  OR_IDX,
} from "../../grammar/keys.js";
import { MixedInParser } from "./parser_traits.js";
import {
  Alternation,
  GAstVisitor,
  getProductionDslName,
  Option,
  Repetition,
  RepetitionMandatory,
  RepetitionMandatoryWithSeparator,
  RepetitionWithSeparator,
  Rule,
} from "@chevrotain/gast";
import { LLkLookaheadStrategy } from "../../grammar/llk_lookahead.js";

/**
 * Trait responsible for the lookahead related utilities and optimizations.
 */
export class LooksAhead {
  maxLookahead: number;
  lookAheadFuncsCache: any;
  dynamicTokensEnabled: boolean;
  lookaheadStrategy: ILookaheadStrategy;

  initLooksAhead(config: IParserConfig) {
    this.dynamicTokensEnabled = has(config, "dynamicTokensEnabled")
      ? (config.dynamicTokensEnabled as boolean) // assumes end user provides the correct config value/type
      : DEFAULT_PARSER_CONFIG.dynamicTokensEnabled;

    this.maxLookahead = has(config, "maxLookahead")
      ? (config.maxLookahead as number) // assumes end user provides the correct config value/type
      : DEFAULT_PARSER_CONFIG.maxLookahead;

    this.lookaheadStrategy = has(config, "lookaheadStrategy")
      ? (config.lookaheadStrategy as ILookaheadStrategy) // assumes end user provides the correct config value/type
      : new LLkLookaheadStrategy({ maxLookahead: this.maxLookahead });

    this.lookAheadFuncsCache = new Map();
  }

  preComputeLookaheadFunctions(this: MixedInParser, rules: Rule[]): void {
    forEach(rules, (currRule) => {
      this.TRACE_INIT(`${currRule.name} Rule Lookahead`, () => {
        const {
          alternation,
          repetition,
          option,
          repetitionMandatory,
          repetitionMandatoryWithSeparator,
          repetitionWithSeparator,
        } = collectMethods(currRule);

        forEach(alternation, (currProd) => {
          const prodIdx = currProd.idx === 0 ? "" : currProd.idx;
          this.TRACE_INIT(`${getProductionDslName(currProd)}${prodIdx}`, () => {
            const laFunc = this.lookaheadStrategy.buildLookaheadForAlternation({
              prodOccurrence: currProd.idx,
              rule: currRule,
              maxLookahead: currProd.maxLookahead || this.maxLookahead,
              hasPredicates: currProd.hasPredicates,
              dynamicTokensEnabled: this.dynamicTokensEnabled,
            });

            const key = getKeyForAutomaticLookahead(
              this.fullRuleNameToShort[currRule.name],
              OR_IDX,
              currProd.idx,
            );
            this.setLaFuncCache(key, laFunc);
          });
        });

        forEach(repetition, (currProd) => {
          this.computeLookaheadFunc(
            currRule,
            currProd.idx,
            MANY_IDX,
            "Repetition",
            currProd.maxLookahead,
            getProductionDslName(currProd),
          );
        });

        forEach(option, (currProd) => {
          this.computeLookaheadFunc(
            currRule,
            currProd.idx,
            OPTION_IDX,
            "Option",
            currProd.maxLookahead,
            getProductionDslName(currProd),
          );
        });

        forEach(repetitionMandatory, (currProd) => {
          this.computeLookaheadFunc(
            currRule,
            currProd.idx,
            AT_LEAST_ONE_IDX,
            "RepetitionMandatory",
            currProd.maxLookahead,
            getProductionDslName(currProd),
          );
        });

        forEach(repetitionMandatoryWithSeparator, (currProd) => {
          this.computeLookaheadFunc(
            currRule,
            currProd.idx,
            AT_LEAST_ONE_SEP_IDX,
            "RepetitionMandatoryWithSeparator",
            currProd.maxLookahead,
            getProductionDslName(currProd),
          );
        });

        forEach(repetitionWithSeparator, (currProd) => {
          this.computeLookaheadFunc(
            currRule,
            currProd.idx,
            MANY_SEP_IDX,
            "RepetitionWithSeparator",
            currProd.maxLookahead,
            getProductionDslName(currProd),
          );
        });
      });
    });
  }

  computeLookaheadFunc(
    this: MixedInParser,
    rule: Rule,
    prodOccurrence: number,
    prodKey: number,
    prodType: OptionalProductionType,
    prodMaxLookahead: number | undefined,
    dslMethodName: string,
  ): void {
    this.TRACE_INIT(
      `${dslMethodName}${prodOccurrence === 0 ? "" : prodOccurrence}`,
      () => {
        const laFunc = this.lookaheadStrategy.buildLookaheadForOptional({
          prodOccurrence,
          rule,
          maxLookahead: prodMaxLookahead || this.maxLookahead,
          dynamicTokensEnabled: this.dynamicTokensEnabled,
          prodType,
        });
        const key = getKeyForAutomaticLookahead(
          this.fullRuleNameToShort[rule.name],
          prodKey,
          prodOccurrence,
        );
        this.setLaFuncCache(key, laFunc);
      },
    );
  }

  // this actually returns a number, but it is always used as a string (object prop key)
  getKeyForAutomaticLookahead(
    this: MixedInParser,
    dslMethodIdx: number,
    occurrence: number,
  ): number {
    const currRuleShortName: any = this.getLastExplicitRuleShortName();
    return getKeyForAutomaticLookahead(
      currRuleShortName,
      dslMethodIdx,
      occurrence,
    );
  }

  getLaFuncFromCache(this: MixedInParser, key: number): Function {
    return this.lookAheadFuncsCache.get(key);
  }

  /* istanbul ignore next */
  setLaFuncCache(this: MixedInParser, key: number, value: Function): void {
    this.lookAheadFuncsCache.set(key, value);
  }
}

class DslMethodsCollectorVisitor extends GAstVisitor {
  public dslMethods: {
    option: Option[];
    alternation: Alternation[];
    repetition: Repetition[];
    repetitionWithSeparator: RepetitionWithSeparator[];
    repetitionMandatory: RepetitionMandatory[];
    repetitionMandatoryWithSeparator: RepetitionMandatoryWithSeparator[];
  } = {
    option: [],
    alternation: [],
    repetition: [],
    repetitionWithSeparator: [],
    repetitionMandatory: [],
    repetitionMandatoryWithSeparator: [],
  };

  reset() {
    this.dslMethods = {
      option: [],
      alternation: [],
      repetition: [],
      repetitionWithSeparator: [],
      repetitionMandatory: [],
      repetitionMandatoryWithSeparator: [],
    };
  }

  public visitOption(option: Option): void {
    this.dslMethods.option.push(option);
  }

  public visitRepetitionWithSeparator(manySep: RepetitionWithSeparator): void {
    this.dslMethods.repetitionWithSeparator.push(manySep);
  }

  public visitRepetitionMandatory(atLeastOne: RepetitionMandatory): void {
    this.dslMethods.repetitionMandatory.push(atLeastOne);
  }

  public visitRepetitionMandatoryWithSeparator(
    atLeastOneSep: RepetitionMandatoryWithSeparator,
  ): void {
    this.dslMethods.repetitionMandatoryWithSeparator.push(atLeastOneSep);
  }

  public visitRepetition(many: Repetition): void {
    this.dslMethods.repetition.push(many);
  }

  public visitAlternation(or: Alternation): void {
    this.dslMethods.alternation.push(or);
  }
}

const collectorVisitor = new DslMethodsCollectorVisitor();
export function collectMethods(rule: Rule): {
  option: Option[];
  alternation: Alternation[];
  repetition: Repetition[];
  repetitionWithSeparator: RepetitionWithSeparator[];
  repetitionMandatory: RepetitionMandatory[];
  repetitionMandatoryWithSeparator: RepetitionMandatoryWithSeparator[];
} {
  collectorVisitor.reset();
  rule.accept(collectorVisitor);
  const dslMethods = collectorVisitor.dslMethods;
  // avoid uncleaned references
  collectorVisitor.reset();
  return <any>dslMethods;
}
