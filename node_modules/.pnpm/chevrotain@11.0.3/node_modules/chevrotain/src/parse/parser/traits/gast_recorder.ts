import {
  AtLeastOneSepMethodOpts,
  ConsumeMethodOpts,
  CstNode,
  DSLMethodOpts,
  DSLMethodOptsWithErr,
  GrammarAction,
  IOrAlt,
  IParserConfig,
  IProduction,
  IToken,
  ManySepMethodOpts,
  OrMethodOpts,
  SubruleMethodOpts,
  TokenType,
} from "@chevrotain/types";
import {
  forEach,
  has,
  isArray,
  isFunction,
  last as peek,
  some,
} from "lodash-es";
import { MixedInParser } from "./parser_traits.js";
import {
  Alternation,
  Alternative,
  NonTerminal,
  Option,
  Repetition,
  RepetitionMandatory,
  RepetitionMandatoryWithSeparator,
  RepetitionWithSeparator,
  Rule,
  Terminal,
} from "@chevrotain/gast";
import { Lexer } from "../../../scan/lexer_public.js";
import {
  augmentTokenTypes,
  hasShortKeyProperty,
} from "../../../scan/tokens.js";
import {
  createToken,
  createTokenInstance,
} from "../../../scan/tokens_public.js";
import { END_OF_FILE } from "../parser.js";
import { BITS_FOR_OCCURRENCE_IDX } from "../../grammar/keys.js";
import { ParserMethodInternal } from "../types.js";

type ProdWithDef = IProduction & { definition?: IProduction[] };
const RECORDING_NULL_OBJECT = {
  description: "This Object indicates the Parser is during Recording Phase",
};
Object.freeze(RECORDING_NULL_OBJECT);

const HANDLE_SEPARATOR = true;
const MAX_METHOD_IDX = Math.pow(2, BITS_FOR_OCCURRENCE_IDX) - 1;

const RFT = createToken({ name: "RECORDING_PHASE_TOKEN", pattern: Lexer.NA });
augmentTokenTypes([RFT]);
const RECORDING_PHASE_TOKEN = createTokenInstance(
  RFT,
  "This IToken indicates the Parser is in Recording Phase\n\t" +
    "" +
    "See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
  // Using "-1" instead of NaN (as in EOF) because an actual number is less likely to
  // cause errors if the output of LA or CONSUME would be (incorrectly) used during the recording phase.
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
);
Object.freeze(RECORDING_PHASE_TOKEN);

const RECORDING_PHASE_CSTNODE: CstNode = {
  name:
    "This CSTNode indicates the Parser is in Recording Phase\n\t" +
    "See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
  children: {},
};

/**
 * This trait handles the creation of the GAST structure for Chevrotain Grammars
 */
export class GastRecorder {
  recordingProdStack: ProdWithDef[];
  RECORDING_PHASE: boolean;

  initGastRecorder(this: MixedInParser, config: IParserConfig): void {
    this.recordingProdStack = [];
    this.RECORDING_PHASE = false;
  }

  enableRecording(this: MixedInParser): void {
    this.RECORDING_PHASE = true;

    this.TRACE_INIT("Enable Recording", () => {
      /**
       * Warning Dark Voodoo Magic upcoming!
       * We are "replacing" the public parsing DSL methods API
       * With **new** alternative implementations on the Parser **instance**
       *
       * So far this is the only way I've found to avoid performance regressions during parsing time.
       * - Approx 30% performance regression was measured on Chrome 75 Canary when attempting to replace the "internal"
       *   implementations directly instead.
       */
      for (let i = 0; i < 10; i++) {
        const idx = i > 0 ? i : "";
        this[`CONSUME${idx}` as "CONSUME"] = function (arg1, arg2) {
          return this.consumeInternalRecord(arg1, i, arg2);
        };
        this[`SUBRULE${idx}` as "SUBRULE"] = function (arg1, arg2) {
          return this.subruleInternalRecord(arg1, i, arg2) as any;
        };
        this[`OPTION${idx}` as "OPTION"] = function (arg1) {
          return this.optionInternalRecord(arg1, i);
        };
        this[`OR${idx}` as "OR"] = function (arg1) {
          return this.orInternalRecord(arg1, i);
        };
        this[`MANY${idx}` as "MANY"] = function (arg1) {
          this.manyInternalRecord(i, arg1);
        };
        this[`MANY_SEP${idx}` as "MANY_SEP"] = function (arg1) {
          this.manySepFirstInternalRecord(i, arg1);
        };
        this[`AT_LEAST_ONE${idx}` as "AT_LEAST_ONE"] = function (arg1) {
          this.atLeastOneInternalRecord(i, arg1);
        };
        this[`AT_LEAST_ONE_SEP${idx}` as "AT_LEAST_ONE_SEP"] = function (arg1) {
          this.atLeastOneSepFirstInternalRecord(i, arg1);
        };
      }

      // DSL methods with the idx(suffix) as an argument
      this[`consume`] = function (idx, arg1, arg2) {
        return this.consumeInternalRecord(arg1, idx, arg2);
      };
      this[`subrule`] = function (idx, arg1, arg2) {
        return this.subruleInternalRecord(arg1, idx, arg2) as any;
      };
      this[`option`] = function (idx, arg1) {
        return this.optionInternalRecord(arg1, idx);
      };
      this[`or`] = function (idx, arg1) {
        return this.orInternalRecord(arg1, idx);
      };
      this[`many`] = function (idx, arg1) {
        this.manyInternalRecord(idx, arg1);
      };
      this[`atLeastOne`] = function (idx, arg1) {
        this.atLeastOneInternalRecord(idx, arg1);
      };

      this.ACTION = this.ACTION_RECORD;
      this.BACKTRACK = this.BACKTRACK_RECORD;
      this.LA = this.LA_RECORD;
    });
  }

  disableRecording(this: MixedInParser) {
    this.RECORDING_PHASE = false;
    // By deleting these **instance** properties, any future invocation
    // will be deferred to the original methods on the **prototype** object
    // This seems to get rid of any incorrect optimizations that V8 may
    // do during the recording phase.
    this.TRACE_INIT("Deleting Recording methods", () => {
      const that: any = this;

      for (let i = 0; i < 10; i++) {
        const idx = i > 0 ? i : "";
        delete that[`CONSUME${idx}`];
        delete that[`SUBRULE${idx}`];
        delete that[`OPTION${idx}`];
        delete that[`OR${idx}`];
        delete that[`MANY${idx}`];
        delete that[`MANY_SEP${idx}`];
        delete that[`AT_LEAST_ONE${idx}`];
        delete that[`AT_LEAST_ONE_SEP${idx}`];
      }

      delete that[`consume`];
      delete that[`subrule`];
      delete that[`option`];
      delete that[`or`];
      delete that[`many`];
      delete that[`atLeastOne`];

      delete that.ACTION;
      delete that.BACKTRACK;
      delete that.LA;
    });
  }

  //   Parser methods are called inside an ACTION?
  //   Maybe try/catch/finally on ACTIONS while disabling the recorders state changes?
  // @ts-expect-error -- noop place holder
  ACTION_RECORD<T>(this: MixedInParser, impl: () => T): T {
    // NO-OP during recording
  }

  // Executing backtracking logic will break our recording logic assumptions
  BACKTRACK_RECORD<T>(
    grammarRule: (...args: any[]) => T,
    args?: any[],
  ): () => boolean {
    return () => true;
  }

  // LA is part of the official API and may be used for custom lookahead logic
  // by end users who may forget to wrap it in ACTION or inside a GATE
  LA_RECORD(howMuch: number): IToken {
    // We cannot use the RECORD_PHASE_TOKEN here because someone may depend
    // On LA return EOF at the end of the input so an infinite loop may occur.
    return END_OF_FILE;
  }

  topLevelRuleRecord(name: string, def: Function): Rule {
    try {
      const newTopLevelRule = new Rule({ definition: [], name: name });
      newTopLevelRule.name = name;
      this.recordingProdStack.push(newTopLevelRule);
      def.call(this);
      this.recordingProdStack.pop();
      return newTopLevelRule;
    } catch (originalError) {
      if (originalError.KNOWN_RECORDER_ERROR !== true) {
        try {
          originalError.message =
            originalError.message +
            '\n\t This error was thrown during the "grammar recording phase" For more info see:\n\t' +
            "https://chevrotain.io/docs/guide/internals.html#grammar-recording";
        } catch (mutabilityError) {
          // We may not be able to modify the original error object
          throw originalError;
        }
      }
      throw originalError;
    }
  }

  // Implementation of parsing DSL
  optionInternalRecord<OUT>(
    this: MixedInParser,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
    occurrence: number,
  ): OUT {
    return recordProd.call(this, Option, actionORMethodDef, occurrence);
  }

  atLeastOneInternalRecord<OUT>(
    this: MixedInParser,
    occurrence: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOptsWithErr<OUT>,
  ): void {
    recordProd.call(this, RepetitionMandatory, actionORMethodDef, occurrence);
  }

  atLeastOneSepFirstInternalRecord<OUT>(
    this: MixedInParser,
    occurrence: number,
    options: AtLeastOneSepMethodOpts<OUT>,
  ): void {
    recordProd.call(
      this,
      RepetitionMandatoryWithSeparator,
      options,
      occurrence,
      HANDLE_SEPARATOR,
    );
  }

  manyInternalRecord<OUT>(
    this: MixedInParser,
    occurrence: number,
    actionORMethodDef: GrammarAction<OUT> | DSLMethodOpts<OUT>,
  ): void {
    recordProd.call(this, Repetition, actionORMethodDef, occurrence);
  }

  manySepFirstInternalRecord<OUT>(
    this: MixedInParser,
    occurrence: number,
    options: ManySepMethodOpts<OUT>,
  ): void {
    recordProd.call(
      this,
      RepetitionWithSeparator,
      options,
      occurrence,
      HANDLE_SEPARATOR,
    );
  }

  orInternalRecord<T>(
    this: MixedInParser,
    altsOrOpts: IOrAlt<any>[] | OrMethodOpts<unknown>,
    occurrence: number,
  ): T {
    return recordOrProd.call(this, altsOrOpts, occurrence);
  }

  subruleInternalRecord<ARGS extends unknown[], R>(
    this: MixedInParser,
    ruleToCall: ParserMethodInternal<ARGS, R>,
    occurrence: number,
    options?: SubruleMethodOpts<ARGS>,
  ): R | CstNode {
    assertMethodIdxIsValid(occurrence);
    if (!ruleToCall || has(ruleToCall, "ruleName") === false) {
      const error: any = new Error(
        `<SUBRULE${getIdxSuffix(occurrence)}> argument is invalid` +
          ` expecting a Parser method reference but got: <${JSON.stringify(
            ruleToCall,
          )}>` +
          `\n inside top level rule: <${
            (<Rule>this.recordingProdStack[0]).name
          }>`,
      );
      error.KNOWN_RECORDER_ERROR = true;
      throw error;
    }

    const prevProd: any = peek(this.recordingProdStack);
    const ruleName = ruleToCall.ruleName;
    const newNoneTerminal = new NonTerminal({
      idx: occurrence,
      nonTerminalName: ruleName,
      label: options?.LABEL,
      // The resolving of the `referencedRule` property will be done once all the Rule's GASTs have been created
      referencedRule: undefined,
    });
    prevProd.definition.push(newNoneTerminal);

    return this.outputCst
      ? RECORDING_PHASE_CSTNODE
      : <any>RECORDING_NULL_OBJECT;
  }

  consumeInternalRecord(
    this: MixedInParser,
    tokType: TokenType,
    occurrence: number,
    options?: ConsumeMethodOpts,
  ): IToken {
    assertMethodIdxIsValid(occurrence);
    if (!hasShortKeyProperty(tokType)) {
      const error: any = new Error(
        `<CONSUME${getIdxSuffix(occurrence)}> argument is invalid` +
          ` expecting a TokenType reference but got: <${JSON.stringify(
            tokType,
          )}>` +
          `\n inside top level rule: <${
            (<Rule>this.recordingProdStack[0]).name
          }>`,
      );
      error.KNOWN_RECORDER_ERROR = true;
      throw error;
    }
    const prevProd: any = peek(this.recordingProdStack);
    const newNoneTerminal = new Terminal({
      idx: occurrence,
      terminalType: tokType,
      label: options?.LABEL,
    });
    prevProd.definition.push(newNoneTerminal);

    return RECORDING_PHASE_TOKEN;
  }
}

function recordProd(
  prodConstructor: any,
  mainProdArg: any,
  occurrence: number,
  handleSep: boolean = false,
): any {
  assertMethodIdxIsValid(occurrence);
  const prevProd: any = peek(this.recordingProdStack);
  const grammarAction = isFunction(mainProdArg) ? mainProdArg : mainProdArg.DEF;

  const newProd = new prodConstructor({ definition: [], idx: occurrence });
  if (handleSep) {
    newProd.separator = mainProdArg.SEP;
  }
  if (has(mainProdArg, "MAX_LOOKAHEAD")) {
    newProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
  }

  this.recordingProdStack.push(newProd);
  grammarAction.call(this);
  prevProd.definition.push(newProd);
  this.recordingProdStack.pop();

  return RECORDING_NULL_OBJECT;
}

function recordOrProd(mainProdArg: any, occurrence: number): any {
  assertMethodIdxIsValid(occurrence);
  const prevProd: any = peek(this.recordingProdStack);
  // Only an array of alternatives
  const hasOptions = isArray(mainProdArg) === false;
  const alts: IOrAlt<unknown>[] =
    hasOptions === false ? mainProdArg : mainProdArg.DEF;

  const newOrProd = new Alternation({
    definition: [],
    idx: occurrence,
    ignoreAmbiguities: hasOptions && mainProdArg.IGNORE_AMBIGUITIES === true,
  });
  if (has(mainProdArg, "MAX_LOOKAHEAD")) {
    newOrProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
  }

  const hasPredicates = some(alts, (currAlt: any) => isFunction(currAlt.GATE));
  newOrProd.hasPredicates = hasPredicates;

  prevProd.definition.push(newOrProd);

  forEach(alts, (currAlt) => {
    const currAltFlat = new Alternative({ definition: [] });
    newOrProd.definition.push(currAltFlat);
    if (has(currAlt, "IGNORE_AMBIGUITIES")) {
      currAltFlat.ignoreAmbiguities = currAlt.IGNORE_AMBIGUITIES as boolean; // assumes end user provides the correct config value/type
    }
    // **implicit** ignoreAmbiguities due to usage of gate
    else if (has(currAlt, "GATE")) {
      currAltFlat.ignoreAmbiguities = true;
    }
    this.recordingProdStack.push(currAltFlat);
    currAlt.ALT.call(this);
    this.recordingProdStack.pop();
  });
  return RECORDING_NULL_OBJECT;
}

function getIdxSuffix(idx: number): string {
  return idx === 0 ? "" : `${idx}`;
}

function assertMethodIdxIsValid(idx: number): void {
  if (idx < 0 || idx > MAX_METHOD_IDX) {
    const error: any = new Error(
      // The stack trace will contain all the needed details
      `Invalid DSL Method idx value: <${idx}>\n\t` +
        `Idx value must be a none negative value smaller than ${
          MAX_METHOD_IDX + 1
        }`,
    );
    error.KNOWN_RECORDER_ERROR = true;
    throw error;
  }
}
