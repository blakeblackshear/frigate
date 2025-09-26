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
} from "./model.js";
import type { IProduction } from "@chevrotain/types";

export abstract class GAstVisitor {
  public visit(node: IProduction): any {
    const nodeAny: any = node;
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
  public visitNonTerminal(node: NonTerminal): any {}

  /* c8 ignore next */
  public visitAlternative(node: Alternative): any {}

  /* c8 ignore next */
  public visitOption(node: Option): any {}

  /* c8 ignore next */
  public visitRepetition(node: Repetition): any {}

  /* c8 ignore next */
  public visitRepetitionMandatory(node: RepetitionMandatory): any {}

  /* c8 ignore next 3 */
  public visitRepetitionMandatoryWithSeparator(
    node: RepetitionMandatoryWithSeparator,
  ): any {}

  /* c8 ignore next */
  public visitRepetitionWithSeparator(node: RepetitionWithSeparator): any {}

  /* c8 ignore next */
  public visitAlternation(node: Alternation): any {}

  /* c8 ignore next */
  public visitTerminal(node: Terminal): any {}

  /* c8 ignore next */
  public visitRule(node: Rule): any {}
}
