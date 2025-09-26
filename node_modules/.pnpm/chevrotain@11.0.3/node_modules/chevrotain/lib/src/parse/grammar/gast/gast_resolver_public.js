import { defaults, forEach } from "lodash-es";
import { resolveGrammar as orgResolveGrammar } from "../resolver.js";
import { validateGrammar as orgValidateGrammar } from "../checks.js";
import { defaultGrammarResolverErrorProvider, defaultGrammarValidatorErrorProvider, } from "../../errors_public.js";
export function resolveGrammar(options) {
    const actualOptions = defaults(options, {
        errMsgProvider: defaultGrammarResolverErrorProvider,
    });
    const topRulesTable = {};
    forEach(options.rules, (rule) => {
        topRulesTable[rule.name] = rule;
    });
    return orgResolveGrammar(topRulesTable, actualOptions.errMsgProvider);
}
export function validateGrammar(options) {
    options = defaults(options, {
        errMsgProvider: defaultGrammarValidatorErrorProvider,
    });
    return orgValidateGrammar(options.rules, options.tokenTypes, options.errMsgProvider, options.grammarName);
}
//# sourceMappingURL=gast_resolver_public.js.map