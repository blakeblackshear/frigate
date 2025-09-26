import { clone, forEach, has, isEmpty, map, values } from "lodash-es";
import { toFastProperties } from "@chevrotain/utils";
import { computeAllProdsFollows } from "../grammar/follow.js";
import { createTokenInstance, EOF } from "../../scan/tokens_public.js";
import { defaultGrammarValidatorErrorProvider, defaultParserErrorProvider, } from "../errors_public.js";
import { resolveGrammar, validateGrammar, } from "../grammar/gast/gast_resolver_public.js";
import { Recoverable } from "./traits/recoverable.js";
import { LooksAhead } from "./traits/looksahead.js";
import { TreeBuilder } from "./traits/tree_builder.js";
import { LexerAdapter } from "./traits/lexer_adapter.js";
import { RecognizerApi } from "./traits/recognizer_api.js";
import { RecognizerEngine } from "./traits/recognizer_engine.js";
import { ErrorHandler } from "./traits/error_handler.js";
import { ContentAssist } from "./traits/context_assist.js";
import { GastRecorder } from "./traits/gast_recorder.js";
import { PerformanceTracer } from "./traits/perf_tracer.js";
import { applyMixins } from "./utils/apply_mixins.js";
import { validateLookahead } from "../grammar/checks.js";
export const END_OF_FILE = createTokenInstance(EOF, "", NaN, NaN, NaN, NaN, NaN, NaN);
Object.freeze(END_OF_FILE);
export const DEFAULT_PARSER_CONFIG = Object.freeze({
    recoveryEnabled: false,
    maxLookahead: 3,
    dynamicTokensEnabled: false,
    outputCst: true,
    errorMessageProvider: defaultParserErrorProvider,
    nodeLocationTracking: "none",
    traceInitPerf: false,
    skipValidations: false,
});
export const DEFAULT_RULE_CONFIG = Object.freeze({
    recoveryValueFunc: () => undefined,
    resyncEnabled: true,
});
export var ParserDefinitionErrorType;
(function (ParserDefinitionErrorType) {
    ParserDefinitionErrorType[ParserDefinitionErrorType["INVALID_RULE_NAME"] = 0] = "INVALID_RULE_NAME";
    ParserDefinitionErrorType[ParserDefinitionErrorType["DUPLICATE_RULE_NAME"] = 1] = "DUPLICATE_RULE_NAME";
    ParserDefinitionErrorType[ParserDefinitionErrorType["INVALID_RULE_OVERRIDE"] = 2] = "INVALID_RULE_OVERRIDE";
    ParserDefinitionErrorType[ParserDefinitionErrorType["DUPLICATE_PRODUCTIONS"] = 3] = "DUPLICATE_PRODUCTIONS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["UNRESOLVED_SUBRULE_REF"] = 4] = "UNRESOLVED_SUBRULE_REF";
    ParserDefinitionErrorType[ParserDefinitionErrorType["LEFT_RECURSION"] = 5] = "LEFT_RECURSION";
    ParserDefinitionErrorType[ParserDefinitionErrorType["NONE_LAST_EMPTY_ALT"] = 6] = "NONE_LAST_EMPTY_ALT";
    ParserDefinitionErrorType[ParserDefinitionErrorType["AMBIGUOUS_ALTS"] = 7] = "AMBIGUOUS_ALTS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["CONFLICT_TOKENS_RULES_NAMESPACE"] = 8] = "CONFLICT_TOKENS_RULES_NAMESPACE";
    ParserDefinitionErrorType[ParserDefinitionErrorType["INVALID_TOKEN_NAME"] = 9] = "INVALID_TOKEN_NAME";
    ParserDefinitionErrorType[ParserDefinitionErrorType["NO_NON_EMPTY_LOOKAHEAD"] = 10] = "NO_NON_EMPTY_LOOKAHEAD";
    ParserDefinitionErrorType[ParserDefinitionErrorType["AMBIGUOUS_PREFIX_ALTS"] = 11] = "AMBIGUOUS_PREFIX_ALTS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["TOO_MANY_ALTS"] = 12] = "TOO_MANY_ALTS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["CUSTOM_LOOKAHEAD_VALIDATION"] = 13] = "CUSTOM_LOOKAHEAD_VALIDATION";
})(ParserDefinitionErrorType || (ParserDefinitionErrorType = {}));
export function EMPTY_ALT(value = undefined) {
    return function () {
        return value;
    };
}
export class Parser {
    /**
     *  @deprecated use the **instance** method with the same name instead
     */
    static performSelfAnalysis(parserInstance) {
        throw Error("The **static** `performSelfAnalysis` method has been deprecated." +
            "\t\nUse the **instance** method with the same name instead.");
    }
    performSelfAnalysis() {
        this.TRACE_INIT("performSelfAnalysis", () => {
            let defErrorsMsgs;
            this.selfAnalysisDone = true;
            const className = this.className;
            this.TRACE_INIT("toFastProps", () => {
                // Without this voodoo magic the parser would be x3-x4 slower
                // It seems it is better to invoke `toFastProperties` **before**
                // Any manipulations of the `this` object done during the recording phase.
                toFastProperties(this);
            });
            this.TRACE_INIT("Grammar Recording", () => {
                try {
                    this.enableRecording();
                    // Building the GAST
                    forEach(this.definedRulesNames, (currRuleName) => {
                        const wrappedRule = this[currRuleName];
                        const originalGrammarAction = wrappedRule["originalGrammarAction"];
                        let recordedRuleGast;
                        this.TRACE_INIT(`${currRuleName} Rule`, () => {
                            recordedRuleGast = this.topLevelRuleRecord(currRuleName, originalGrammarAction);
                        });
                        this.gastProductionsCache[currRuleName] = recordedRuleGast;
                    });
                }
                finally {
                    this.disableRecording();
                }
            });
            let resolverErrors = [];
            this.TRACE_INIT("Grammar Resolving", () => {
                resolverErrors = resolveGrammar({
                    rules: values(this.gastProductionsCache),
                });
                this.definitionErrors = this.definitionErrors.concat(resolverErrors);
            });
            this.TRACE_INIT("Grammar Validations", () => {
                // only perform additional grammar validations IFF no resolving errors have occurred.
                // as unresolved grammar may lead to unhandled runtime exceptions in the follow up validations.
                if (isEmpty(resolverErrors) && this.skipValidations === false) {
                    const validationErrors = validateGrammar({
                        rules: values(this.gastProductionsCache),
                        tokenTypes: values(this.tokensMap),
                        errMsgProvider: defaultGrammarValidatorErrorProvider,
                        grammarName: className,
                    });
                    const lookaheadValidationErrors = validateLookahead({
                        lookaheadStrategy: this.lookaheadStrategy,
                        rules: values(this.gastProductionsCache),
                        tokenTypes: values(this.tokensMap),
                        grammarName: className,
                    });
                    this.definitionErrors = this.definitionErrors.concat(validationErrors, lookaheadValidationErrors);
                }
            });
            // this analysis may fail if the grammar is not perfectly valid
            if (isEmpty(this.definitionErrors)) {
                // The results of these computations are not needed unless error recovery is enabled.
                if (this.recoveryEnabled) {
                    this.TRACE_INIT("computeAllProdsFollows", () => {
                        const allFollows = computeAllProdsFollows(values(this.gastProductionsCache));
                        this.resyncFollows = allFollows;
                    });
                }
                this.TRACE_INIT("ComputeLookaheadFunctions", () => {
                    var _a, _b;
                    (_b = (_a = this.lookaheadStrategy).initialize) === null || _b === void 0 ? void 0 : _b.call(_a, {
                        rules: values(this.gastProductionsCache),
                    });
                    this.preComputeLookaheadFunctions(values(this.gastProductionsCache));
                });
            }
            if (!Parser.DEFER_DEFINITION_ERRORS_HANDLING &&
                !isEmpty(this.definitionErrors)) {
                defErrorsMsgs = map(this.definitionErrors, (defError) => defError.message);
                throw new Error(`Parser Definition Errors detected:\n ${defErrorsMsgs.join("\n-------------------------------\n")}`);
            }
        });
    }
    constructor(tokenVocabulary, config) {
        this.definitionErrors = [];
        this.selfAnalysisDone = false;
        const that = this;
        that.initErrorHandler(config);
        that.initLexerAdapter();
        that.initLooksAhead(config);
        that.initRecognizerEngine(tokenVocabulary, config);
        that.initRecoverable(config);
        that.initTreeBuilder(config);
        that.initContentAssist();
        that.initGastRecorder(config);
        that.initPerformanceTracer(config);
        if (has(config, "ignoredIssues")) {
            throw new Error("The <ignoredIssues> IParserConfig property has been deprecated.\n\t" +
                "Please use the <IGNORE_AMBIGUITIES> flag on the relevant DSL method instead.\n\t" +
                "See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#IGNORING_AMBIGUITIES\n\t" +
                "For further details.");
        }
        this.skipValidations = has(config, "skipValidations")
            ? config.skipValidations // casting assumes the end user passing the correct type
            : DEFAULT_PARSER_CONFIG.skipValidations;
    }
}
// Set this flag to true if you don't want the Parser to throw error when problems in it's definition are detected.
// (normally during the parser's constructor).
// This is a design time flag, it will not affect the runtime error handling of the parser, just design time errors,
// for example: duplicate rule names, referencing an unresolved subrule, ect...
// This flag should not be enabled during normal usage, it is used in special situations, for example when
// needing to display the parser definition errors in some GUI(online playground).
Parser.DEFER_DEFINITION_ERRORS_HANDLING = false;
applyMixins(Parser, [
    Recoverable,
    LooksAhead,
    TreeBuilder,
    LexerAdapter,
    RecognizerEngine,
    RecognizerApi,
    ErrorHandler,
    ContentAssist,
    GastRecorder,
    PerformanceTracer,
]);
export class CstParser extends Parser {
    constructor(tokenVocabulary, config = DEFAULT_PARSER_CONFIG) {
        const configClone = clone(config);
        configClone.outputCst = true;
        super(tokenVocabulary, configClone);
    }
}
export class EmbeddedActionsParser extends Parser {
    constructor(tokenVocabulary, config = DEFAULT_PARSER_CONFIG) {
        const configClone = clone(config);
        configClone.outputCst = false;
        super(tokenVocabulary, configClone);
    }
}
//# sourceMappingURL=parser.js.map