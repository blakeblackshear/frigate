import { flatten, map, uniq } from "lodash-es";
import {
  isBranchingProd,
  isOptionalProd,
  isSequenceProd,
  NonTerminal,
  Terminal,
} from "@chevrotain/gast";
import { IProduction, TokenType } from "@chevrotain/types";

export function first(prod: IProduction): TokenType[] {
  /* istanbul ignore else */
  if (prod instanceof NonTerminal) {
    // this could in theory cause infinite loops if
    // (1) prod A refs prod B.
    // (2) prod B refs prod A
    // (3) AB can match the empty set
    // in other words a cycle where everything is optional so the first will keep
    // looking ahead for the next optional part and will never exit
    // currently there is no safeguard for this unique edge case because
    // (1) not sure a grammar in which this can happen is useful for anything (productive)
    return first((<NonTerminal>prod).referencedRule);
  } else if (prod instanceof Terminal) {
    return firstForTerminal(<Terminal>prod);
  } else if (isSequenceProd(prod)) {
    return firstForSequence(prod);
  } else if (isBranchingProd(prod)) {
    return firstForBranching(prod);
  } else {
    throw Error("non exhaustive match");
  }
}

export function firstForSequence(prod: {
  definition: IProduction[];
}): TokenType[] {
  let firstSet: TokenType[] = [];
  const seq = prod.definition;
  let nextSubProdIdx = 0;
  let hasInnerProdsRemaining = seq.length > nextSubProdIdx;
  let currSubProd;
  // so we enter the loop at least once (if the definition is not empty
  let isLastInnerProdOptional = true;
  // scan a sequence until it's end or until we have found a NONE optional production in it
  while (hasInnerProdsRemaining && isLastInnerProdOptional) {
    currSubProd = seq[nextSubProdIdx];
    isLastInnerProdOptional = isOptionalProd(currSubProd);
    firstSet = firstSet.concat(first(currSubProd));
    nextSubProdIdx = nextSubProdIdx + 1;
    hasInnerProdsRemaining = seq.length > nextSubProdIdx;
  }

  return uniq(firstSet);
}

export function firstForBranching(prod: {
  definition: IProduction[];
}): TokenType[] {
  const allAlternativesFirsts: TokenType[][] = map(
    prod.definition,
    (innerProd) => {
      return first(innerProd);
    },
  );
  return uniq(flatten<TokenType>(allAlternativesFirsts));
}

export function firstForTerminal(terminal: Terminal): TokenType[] {
  return [terminal.terminalType];
}
