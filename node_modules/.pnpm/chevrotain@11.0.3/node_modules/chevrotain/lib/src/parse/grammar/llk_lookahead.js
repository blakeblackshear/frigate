import { flatMap, isEmpty } from "lodash-es";
import { defaultGrammarValidatorErrorProvider } from "../errors_public.js";
import { DEFAULT_PARSER_CONFIG } from "../parser/parser.js";
import { validateAmbiguousAlternationAlternatives, validateEmptyOrAlternative, validateNoLeftRecursion, validateSomeNonEmptyLookaheadPath, } from "./checks.js";
import { buildAlternativesLookAheadFunc, buildLookaheadFuncForOptionalProd, buildLookaheadFuncForOr, buildSingleAlternativeLookaheadFunction, getProdType, } from "./lookahead.js";
export class LLkLookaheadStrategy {
    constructor(options) {
        var _a;
        this.maxLookahead =
            (_a = options === null || options === void 0 ? void 0 : options.maxLookahead) !== null && _a !== void 0 ? _a : DEFAULT_PARSER_CONFIG.maxLookahead;
    }
    validate(options) {
        const leftRecursionErrors = this.validateNoLeftRecursion(options.rules);
        if (isEmpty(leftRecursionErrors)) {
            const emptyAltErrors = this.validateEmptyOrAlternatives(options.rules);
            const ambiguousAltsErrors = this.validateAmbiguousAlternationAlternatives(options.rules, this.maxLookahead);
            const emptyRepetitionErrors = this.validateSomeNonEmptyLookaheadPath(options.rules, this.maxLookahead);
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
    validateNoLeftRecursion(rules) {
        return flatMap(rules, (currTopRule) => validateNoLeftRecursion(currTopRule, currTopRule, defaultGrammarValidatorErrorProvider));
    }
    validateEmptyOrAlternatives(rules) {
        return flatMap(rules, (currTopRule) => validateEmptyOrAlternative(currTopRule, defaultGrammarValidatorErrorProvider));
    }
    validateAmbiguousAlternationAlternatives(rules, maxLookahead) {
        return flatMap(rules, (currTopRule) => validateAmbiguousAlternationAlternatives(currTopRule, maxLookahead, defaultGrammarValidatorErrorProvider));
    }
    validateSomeNonEmptyLookaheadPath(rules, maxLookahead) {
        return validateSomeNonEmptyLookaheadPath(rules, maxLookahead, defaultGrammarValidatorErrorProvider);
    }
    buildLookaheadForAlternation(options) {
        return buildLookaheadFuncForOr(options.prodOccurrence, options.rule, options.maxLookahead, options.hasPredicates, options.dynamicTokensEnabled, buildAlternativesLookAheadFunc);
    }
    buildLookaheadForOptional(options) {
        return buildLookaheadFuncForOptionalProd(options.prodOccurrence, options.rule, options.maxLookahead, options.dynamicTokensEnabled, getProdType(options.prodType), buildSingleAlternativeLookaheadFunction);
    }
}
//# sourceMappingURL=llk_lookahead.js.map