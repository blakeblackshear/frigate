import { assign, forEach, isRegExp, isString, map, pickBy } from "lodash-es";
// TODO: duplicated code to avoid extracting another sub-package -- how to avoid?
function tokenLabel(tokType) {
    if (hasTokenLabel(tokType)) {
        return tokType.LABEL;
    }
    else {
        return tokType.name;
    }
}
// TODO: duplicated code to avoid extracting another sub-package -- how to avoid?
function hasTokenLabel(obj) {
    return isString(obj.LABEL) && obj.LABEL !== "";
}
export class AbstractProduction {
    get definition() {
        return this._definition;
    }
    set definition(value) {
        this._definition = value;
    }
    constructor(_definition) {
        this._definition = _definition;
    }
    accept(visitor) {
        visitor.visit(this);
        forEach(this.definition, (prod) => {
            prod.accept(visitor);
        });
    }
}
export class NonTerminal extends AbstractProduction {
    constructor(options) {
        super([]);
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
    set definition(definition) {
        // immutable
    }
    get definition() {
        if (this.referencedRule !== undefined) {
            return this.referencedRule.definition;
        }
        return [];
    }
    accept(visitor) {
        visitor.visit(this);
        // don't visit children of a reference, we will get cyclic infinite loops if we do so
    }
}
export class Rule extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.orgText = "";
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class Alternative extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.ignoreAmbiguities = false;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class Option extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class RepetitionMandatory extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class RepetitionMandatoryWithSeparator extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class Repetition extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class RepetitionWithSeparator extends AbstractProduction {
    constructor(options) {
        super(options.definition);
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class Alternation extends AbstractProduction {
    get definition() {
        return this._definition;
    }
    set definition(value) {
        this._definition = value;
    }
    constructor(options) {
        super(options.definition);
        this.idx = 1;
        this.ignoreAmbiguities = false;
        this.hasPredicates = false;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
}
export class Terminal {
    constructor(options) {
        this.idx = 1;
        assign(this, pickBy(options, (v) => v !== undefined));
    }
    accept(visitor) {
        visitor.visit(this);
    }
}
export function serializeGrammar(topRules) {
    return map(topRules, serializeProduction);
}
export function serializeProduction(node) {
    function convertDefinition(definition) {
        return map(definition, serializeProduction);
    }
    /* istanbul ignore else */
    if (node instanceof NonTerminal) {
        const serializedNonTerminal = {
            type: "NonTerminal",
            name: node.nonTerminalName,
            idx: node.idx,
        };
        if (isString(node.label)) {
            serializedNonTerminal.label = node.label;
        }
        return serializedNonTerminal;
    }
    else if (node instanceof Alternative) {
        return {
            type: "Alternative",
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof Option) {
        return {
            type: "Option",
            idx: node.idx,
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof RepetitionMandatory) {
        return {
            type: "RepetitionMandatory",
            idx: node.idx,
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof RepetitionMandatoryWithSeparator) {
        return {
            type: "RepetitionMandatoryWithSeparator",
            idx: node.idx,
            separator: (serializeProduction(new Terminal({ terminalType: node.separator }))),
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof RepetitionWithSeparator) {
        return {
            type: "RepetitionWithSeparator",
            idx: node.idx,
            separator: (serializeProduction(new Terminal({ terminalType: node.separator }))),
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof Repetition) {
        return {
            type: "Repetition",
            idx: node.idx,
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof Alternation) {
        return {
            type: "Alternation",
            idx: node.idx,
            definition: convertDefinition(node.definition),
        };
    }
    else if (node instanceof Terminal) {
        const serializedTerminal = {
            type: "Terminal",
            name: node.terminalType.name,
            label: tokenLabel(node.terminalType),
            idx: node.idx,
        };
        if (isString(node.label)) {
            serializedTerminal.terminalLabel = node.label;
        }
        const pattern = node.terminalType.PATTERN;
        if (node.terminalType.PATTERN) {
            serializedTerminal.pattern = isRegExp(pattern)
                ? pattern.source
                : pattern;
        }
        return serializedTerminal;
    }
    else if (node instanceof Rule) {
        return {
            type: "Rule",
            name: node.name,
            orgText: node.orgText,
            definition: convertDefinition(node.definition),
        };
        /* c8 ignore next 3 */
    }
    else {
        throw Error("non exhaustive match");
    }
}
//# sourceMappingURL=model.js.map