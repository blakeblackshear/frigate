import { Alternation, Alternative, NonTerminal, Option, Repetition, RepetitionMandatory, RepetitionMandatoryWithSeparator, RepetitionWithSeparator, Rule, Terminal, } from "./model.js";
export class GAstVisitor {
    visit(node) {
        const nodeAny = node;
        switch (nodeAny.constructor) {
            case NonTerminal:
                return this.visitNonTerminal(nodeAny);
            case Alternative:
                return this.visitAlternative(nodeAny);
            case Option:
                return this.visitOption(nodeAny);
            case RepetitionMandatory:
                return this.visitRepetitionMandatory(nodeAny);
            case RepetitionMandatoryWithSeparator:
                return this.visitRepetitionMandatoryWithSeparator(nodeAny);
            case RepetitionWithSeparator:
                return this.visitRepetitionWithSeparator(nodeAny);
            case Repetition:
                return this.visitRepetition(nodeAny);
            case Alternation:
                return this.visitAlternation(nodeAny);
            case Terminal:
                return this.visitTerminal(nodeAny);
            case Rule:
                return this.visitRule(nodeAny);
            /* c8 ignore next 2 */
            default:
                throw Error("non exhaustive match");
        }
    }
    /* c8 ignore next */
    visitNonTerminal(node) { }
    /* c8 ignore next */
    visitAlternative(node) { }
    /* c8 ignore next */
    visitOption(node) { }
    /* c8 ignore next */
    visitRepetition(node) { }
    /* c8 ignore next */
    visitRepetitionMandatory(node) { }
    /* c8 ignore next 3 */
    visitRepetitionMandatoryWithSeparator(node) { }
    /* c8 ignore next */
    visitRepetitionWithSeparator(node) { }
    /* c8 ignore next */
    visitAlternation(node) { }
    /* c8 ignore next */
    visitTerminal(node) { }
    /* c8 ignore next */
    visitRule(node) { }
}
//# sourceMappingURL=visitor.js.map