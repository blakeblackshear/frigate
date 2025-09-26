import {
  AtLeastOneSepMethodOpts,
  ConsumeMethodOpts,
  DSLMethodOpts,
  DSLMethodOptsWithErr,
  GrammarAction,
  IOrAlt,
  IRuleConfig,
  ISerializedGast,
  IToken,
  ManySepMethodOpts,
  OrMethodOpts,
  SubruleMethodOpts,
  TokenType,
} from "@chevrotain/types";
import { includes, values } from "lodash-es";
import { isRecognitionException } from "../../exceptions_public.js";
import { DEFAULT_RULE_CONFIG, ParserDefinitionErrorType } from "../parser.js";
import { defaultGrammarValidatorErrorProvider } from "../../errors_public.js";
import { validateRuleIsOverridden } from "../../grammar/checks.js";
import { MixedInParser } from "./parser_traits.js";
import { Rule, serializeGrammar } from "@chevrotain/gast";
import { IParserDefinitionError } from "../../grammar/types.js";
import { ParserMethodInternal } from "../types.js";

/**
 * This trait is responsible for implementing the public API
 * for defining Chevrotain parsers, i.e:
 * - CONSUME
 * - RULE
 * - OPTION
 * - ...
 */
export class RecognizerApi {
  ACTION<T>(this: MixedInParser, impl: () => T): T {
    return impl.call(this);
  }

  consume(
    this: MixedInParser,
    idx: number,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, idx, options);
  }

  subrule<ARGS extends unknown[], R>(
    this: MixedInParser,
    idx: number,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, idx, options);
  }

  option<OUT>(
    this: MixedInParser,
    idx: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, idx);
  }

  or(
    this: MixedInParser,
    idx: number,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<any>,
  ): any {
    return this.orInternal(altsOrOpts, idx);
  }

  many(
    this: MixedInParser,
    idx: number,
    actionORMethodDef: GrammarAction<any> | DSLMethodOpts<any>,
  ): void {
    return this.manyInternal(idx, actionORMethodDef);
  }

  atLeastOne(
    this: MixedInParser,
    idx: number,
    actionORMethodDef: GrammarAction<any> | DSLMethodOptsWithErr<any>,
  ): void {
    return this.atLeastOneInternal(idx, actionORMethodDef);
  }

  CONSUME(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 0, options);
  }

  CONSUME1(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 1, options);
  }

  CONSUME2(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 2, options);
  }

  CONSUME3(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 3, options);
  }

  CONSUME4(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 4, options);
  }

  CONSUME5(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 5, options);
  }

  CONSUME6(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 6, options);
  }

  CONSUME7(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 7, options);
  }

  CONSUME8(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 8, options);
  }

  CONSUME9(
    this: MixedInParser,
    tokType: TokenType,
    options?: ConsumeMethodOpts,
  ): IToken {
    return this.consumeInternal(tokType, 9, options);
  }

  SUBRULE<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 0, options);
  }

  SUBRULE1<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 1, options);
  }

  SUBRULE2<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 2, options);
  }

  SUBRULE3<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 3, options);
  }

  SUBRULE4<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 4, options);
  }

  SUBRULE5<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 5, options);
  }

  SUBRULE6<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 6, options);
  }

  SUBRULE7<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 7, options);
  }

  SUBRULE8<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 8, options);
  }

  SUBRULE9<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    options?: SubruleMethodOpts<ARGS>,
  ): R {
    return this.subruleInternal(ruleToCall, 9, options);
  }

  OPTION<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 0);
  }

  OPTION1<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 1);
  }

  OPTION2<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 2);
  }

  OPTION3<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 3);
  }

  OPTION4<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 4);
  }

  OPTION5<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 5);
  }

  OPTION6<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 6);
  }

  OPTION7<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 7);
  }

  OPTION8<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 8);
  }

  OPTION9<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): OUT | undefined {
    return this.optionInternal(actionORMethodDef, 9);
  }

  OR<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 0);
  }

  OR1<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 1);
  }

  OR2<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 2);
  }

  OR3<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 3);
  }

  OR4<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 4);
  }

  OR5<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 5);
  }

  OR6<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 6);
  }

  OR7<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 7);
  }

  OR8<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 8);
  }

  OR9<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
  ): T {
    return this.orInternal(altsOrOpts, 9);
  }

  MANY<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(0, actionORMethodDef);
  }

  MANY1<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(1, actionORMethodDef);
  }

  MANY2<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(2, actionORMethodDef);
  }

  MANY3<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(3, actionORMethodDef);
  }

  MANY4<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(4, actionORMethodDef);
  }

  MANY5<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(5, actionORMethodDef);
  }

  MANY6<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(6, actionORMethodDef);
  }

  MANY7<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(7, actionORMethodDef);
  }

  MANY8<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(8, actionORMethodDef);
  }

  MANY9<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    this.manyInternal(9, actionORMethodDef);
  }

  MANY_SEP<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(0, options);
  }

  MANY_SEP1<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(1, options);
  }

  MANY_SEP2<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(2, options);
  }

  MANY_SEP3<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(3, options);
  }

  MANY_SEP4<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(4, options);
  }

  MANY_SEP5<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(5, options);
  }

  MANY_SEP6<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(6, options);
  }

  MANY_SEP7<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(7, options);
  }

  MANY_SEP8<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(8, options);
  }

  MANY_SEP9<OUT>(this: MixedInParser, options: ManySepMethodOpts<OUT>): void {
    this.manySepFirstInternal(9, options);
  }

  AT_LEAST_ONE<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(0, actionORMethodDef);
  }

  AT_LEAST_ONE1<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    return this.atLeastOneInternal(1, actionORMethodDef);
  }

  AT_LEAST_ONE2<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(2, actionORMethodDef);
  }

  AT_LEAST_ONE3<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(3, actionORMethodDef);
  }

  AT_LEAST_ONE4<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(4, actionORMethodDef);
  }

  AT_LEAST_ONE5<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(5, actionORMethodDef);
  }

  AT_LEAST_ONE6<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(6, actionORMethodDef);
  }

  AT_LEAST_ONE7<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(7, actionORMethodDef);
  }

  AT_LEAST_ONE8<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(8, actionORMethodDef);
  }

  AT_LEAST_ONE9<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    this.atLeastOneInternal(9, actionORMethodDef);
  }

  AT_LEAST_ONE_SEP<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(0, options);
  }

  AT_LEAST_ONE_SEP1<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(1, options);
  }

  AT_LEAST_ONE_SEP2<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(2, options);
  }

  AT_LEAST_ONE_SEP3<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(3, options);
  }

  AT_LEAST_ONE_SEP4<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(4, options);
  }

  AT_LEAST_ONE_SEP5<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(5, options);
  }

  AT_LEAST_ONE_SEP6<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(6, options);
  }

  AT_LEAST_ONE_SEP7<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(7, options);
  }

  AT_LEAST_ONE_SEP8<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(8, options);
  }

  AT_LEAST_ONE_SEP9<OUT>(
    this: MixedInParser,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    this.atLeastOneSepFirstInternal(9, options);
  }

  RULE<T>(
    this: MixedInParser,
    name: string,
    implementation: (...implArgs: any[]) => T,
    config: IRuleConfig<T> = DEFAULT_RULE_CONFIG,
  ): (idxInCallingRule?: number, ...args: any[]) => T | any {
    if (includes(this.definedRulesNames, name)) {
      const errMsg =
        defaultGrammarValidatorErrorProvider.buildDuplicateRuleNameError({
          topLevelRule: name,
          grammarName: this.className,
        });

      const error = {
        message: errMsg,
        type: ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
        ruleName: name,
      };
      this.definitionErrors.push(error);
    }

    this.definedRulesNames.push(name);

    const ruleImplementation = this.defineRule(name, implementation, config);
    (this as any)[name] = ruleImplementation;
    return ruleImplementation;
  }

  OVERRIDE_RULE<T>(
    this: MixedInParser,
    name: string,
    impl: (...implArgs: any[]) => T,
    config: IRuleConfig<T> = DEFAULT_RULE_CONFIG,
  ): (idxInCallingRule?: number, ...args: any[]) => T {
    const ruleErrors: IParserDefinitionError[] = validateRuleIsOverridden(
      name,
      this.definedRulesNames,
      this.className,
    );
    this.definitionErrors = this.definitionErrors.concat(ruleErrors);

    const ruleImplementation = this.defineRule(name, impl, config);
    (this as any)[name] = ruleImplementation;
    return ruleImplementation;
  }

  BACKTRACK<T>(
    this: MixedInParser,
    grammarRule: (...args: any[]) => T,
    args?: any[],
  ): () => boolean {
    return function () {
      // save org state
      this.isBackTrackingStack.push(1);
      const orgState = this.saveRecogState();
      try {
        grammarRule.apply(this, args);
        // if no exception was thrown we have succeed parsing the rule.
        return true;
      } catch (e) {
        if (isRecognitionException(e)) {
          return false;
        } else {
          throw e;
        }
      } finally {
        this.reloadRecogState(orgState);
        this.isBackTrackingStack.pop();
      }
    };
  }

  // GAST export APIs
  public getGAstProductions(this: MixedInParser): Record<string, Rule> {
    return this.gastProductionsCache;
  }

  public getSerializedGastProductions(this: MixedInParser): ISerializedGast[] {
    return serializeGrammar(values(this.gastProductionsCache));
  }
}
