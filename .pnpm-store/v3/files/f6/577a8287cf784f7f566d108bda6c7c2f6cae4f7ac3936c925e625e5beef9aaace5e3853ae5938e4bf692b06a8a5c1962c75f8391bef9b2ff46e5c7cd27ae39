import { RestWalker } from "./rest.js";
import { first } from "./first.js";
import { assign, forEach } from "lodash-es";
import { IN } from "../constants.js";
import { Alternative, NonTerminal, Rule, Terminal } from "@chevrotain/gast";
import { IProduction, TokenType } from "@chevrotain/types";

// This ResyncFollowsWalker computes all of the follows required for RESYNC
// (skipping reference production).
export class ResyncFollowsWalker extends RestWalker {
  public follows: Record<string, TokenType[]> = {};

  constructor(private topProd: Rule) {
    super();
  }

  startWalking(): Record<string, TokenType[]> {
    this.walk(this.topProd);
    return this.follows;
  }

  walkTerminal(
    terminal: Terminal,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // do nothing! just like in the public sector after 13:00
  }

  walkProdRef(
    refProd: NonTerminal,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    const followName =
      buildBetweenProdsFollowPrefix(refProd.referencedRule, refProd.idx) +
      this.topProd.name;
    const fullRest: IProduction[] = currRest.concat(prevRest);
    const restProd = new Alternative({ definition: fullRest });
    const t_in_topProd_follows = first(restProd);
    this.follows[followName] = t_in_topProd_follows;
  }
}

export function computeAllProdsFollows(
  topProductions: Rule[],
): Record<string, TokenType[]> {
  const reSyncFollows = {};

  forEach(topProductions, (topProd) => {
    const currRefsFollow = new ResyncFollowsWalker(topProd).startWalking();
    assign(reSyncFollows, currRefsFollow);
  });
  return reSyncFollows;
}

export function buildBetweenProdsFollowPrefix(
  inner: Rule,
  occurenceInParent: number,
): string {
  return inner.name + occurenceInParent + IN;
}

export function buildInProdFollowPrefix(terminal: Terminal): string {
  const terminalName = terminal.terminalType.name;
  return terminalName + terminal.idx + IN;
}
