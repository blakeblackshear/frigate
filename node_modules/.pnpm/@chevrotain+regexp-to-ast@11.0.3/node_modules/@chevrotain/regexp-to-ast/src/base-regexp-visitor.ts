import type {
  Alternative,
  Assertion,
  Character,
  Disjunction,
  Group,
  GroupBackReference,
  IRegExpAST,
  Quantifier,
  RegExpAstPart,
  RegExpFlags,
  RegExpPattern,
  Set,
} from "../types";

export class BaseRegExpVisitor {
  public visitChildren(node: IRegExpAST) {
    for (const key in node) {
      const child = (node as any)[key];
      /* istanbul ignore else */
      if (node.hasOwnProperty(key)) {
        if (child.type !== undefined) {
          this.visit(child);
        } else if (Array.isArray(child)) {
          child.forEach((subChild) => {
            this.visit(subChild);
          }, this);
        }
      }
    }
  }

  public visit(node: RegExpAstPart): void {
    switch (node.type) {
      case "Pattern":
        this.visitPattern(node);
        break;
      case "Flags":
        this.visitFlags(node);
        break;
      case "Disjunction":
        this.visitDisjunction(node);
        break;
      case "Alternative":
        this.visitAlternative(node);
        break;
      case "StartAnchor":
        this.visitStartAnchor(node);
        break;
      case "EndAnchor":
        this.visitEndAnchor(node);
        break;
      case "WordBoundary":
        this.visitWordBoundary(node);
        break;
      case "NonWordBoundary":
        this.visitNonWordBoundary(node);
        break;
      case "Lookahead":
        this.visitLookahead(node);
        break;
      case "NegativeLookahead":
        this.visitNegativeLookahead(node);
        break;
      case "Character":
        this.visitCharacter(node);
        break;
      case "Set":
        this.visitSet(node);
        break;
      case "Group":
        this.visitGroup(node);
        break;
      case "GroupBackReference":
        this.visitGroupBackReference(node);
        break;
      case "Quantifier":
        this.visitQuantifier(node);
        break;
    }

    this.visitChildren(node);
  }

  public visitPattern(node: RegExpPattern): void {}

  public visitFlags(node: RegExpFlags): void {}

  public visitDisjunction(node: Disjunction): void {}

  public visitAlternative(node: Alternative): void {}

  // Assertion
  public visitStartAnchor(node: Assertion): void {}

  public visitEndAnchor(node: Assertion): void {}

  public visitWordBoundary(node: Assertion): void {}

  public visitNonWordBoundary(node: Assertion): void {}

  public visitLookahead(node: Assertion): void {}

  public visitNegativeLookahead(node: Assertion): void {}

  // atoms
  public visitCharacter(node: Character): void {}

  public visitSet(node: Set): void {}

  public visitGroup(node: Group): void {}

  public visitGroupBackReference(node: GroupBackReference): void {}

  public visitQuantifier(node: Quantifier): void {}
}
