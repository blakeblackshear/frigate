import { every, includes, some } from "lodash-es";
import { AbstractProduction, Alternation, Alternative, NonTerminal, Option, Repetition, RepetitionMandatory, RepetitionMandatoryWithSeparator, RepetitionWithSeparator, Rule, Terminal, } from "./model.js";
export function isSequenceProd(prod) {
    return (prod instanceof Alternative ||
        prod instanceof Option ||
        prod instanceof Repetition ||
        prod instanceof RepetitionMandatory ||
        prod instanceof RepetitionMandatoryWithSeparator ||
        prod instanceof RepetitionWithSeparator ||
        prod instanceof Terminal ||
        prod instanceof Rule);
}
export function isOptionalProd(prod, alreadyVisited = []) {
    const isDirectlyOptional = prod instanceof Option ||
        prod instanceof Repetition ||
        prod instanceof RepetitionWithSeparator;
    if (isDirectlyOptional) {
        return true;
    }
    // note that this can cause infinite loop if one optional empty TOP production has a cyclic dependency with another
    // empty optional top rule
    // may be indirectly optional ((A?B?C?) | (D?E?F?))
    if (prod instanceof Alternation) {
        // for OR its enough for just one of the alternatives to be optional
        return some(prod.definition, (subProd) => {
            return isOptionalProd(subProd, alreadyVisited);
        });
    }
    else if (prod instanceof NonTerminal && includes(alreadyVisited, prod)) {
        // avoiding stack overflow due to infinite recursion
        return false;
    }
    else if (prod instanceof AbstractProduction) {
        if (prod instanceof NonTerminal) {
            alreadyVisited.push(prod);
        }
        return every(prod.definition, (subProd) => {
            return isOptionalProd(subProd, alreadyVisited);
        });
    }
    else {
        return false;
    }
}
export function isBranchingProd(prod) {
    return prod instanceof Alternation;
}
export function getProductionDslName(prod) {
    /* istanbul ignore else */
    if (prod instanceof NonTerminal) {
        return "SUBRULE";
    }
    else if (prod instanceof Option) {
        return "OPTION";
    }
    else if (prod instanceof Alternation) {
        return "OR";
    }
    else if (prod instanceof RepetitionMandatory) {
        return "AT_LEAST_ONE";
    }
    else if (prod instanceof RepetitionMandatoryWithSeparator) {
        return "AT_LEAST_ONE_SEP";
    }
    else if (prod instanceof RepetitionWithSeparator) {
        return "MANY_SEP";
    }
    else if (prod instanceof Repetition) {
        return "MANY";
    }
    else if (prod instanceof Terminal) {
        return "CONSUME";
        /* c8 ignore next 3 */
    }
    else {
        throw Error("non exhaustive match");
    }
}
//# sourceMappingURL=helpers.js.map