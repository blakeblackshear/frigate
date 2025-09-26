import { Alternation, Alternative, NonTerminal, Option, Repetition, RepetitionMandatory, RepetitionMandatoryWithSeparator, RepetitionWithSeparator, Rule, Terminal } from "./model.js";
import type { IProduction } from "@chevrotain/types";
export declare abstract class GAstVisitor {
    visit(node: IProduction): any;
    visitNonTerminal(node: NonTerminal): any;
    visitAlternative(node: Alternative): any;
    visitOption(node: Option): any;
    visitRepetition(node: Repetition): any;
    visitRepetitionMandatory(node: RepetitionMandatory): any;
    visitRepetitionMandatoryWithSeparator(node: RepetitionMandatoryWithSeparator): any;
    visitRepetitionWithSeparator(node: RepetitionWithSeparator): any;
    visitAlternation(node: Alternation): any;
    visitTerminal(node: Terminal): any;
    visitRule(node: Rule): any;
}
