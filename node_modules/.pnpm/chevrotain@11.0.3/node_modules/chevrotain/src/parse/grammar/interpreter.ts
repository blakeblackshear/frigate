import {
  clone,
  drop,
  dropRight,
  first as _first,
  forEach,
  isEmpty,
  last,
} from "lodash-es";
import { first } from "./first.js";
import { RestWalker } from "./rest.js";
import { TokenMatcher } from "../parser/parser.js";
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
} from "@chevrotain/gast";
import {
  IGrammarPath,
  IProduction,
  ISyntacticContentAssistPath,
  IToken,
  ITokenGrammarPath,
  TokenType,
} from "@chevrotain/types";

export abstract class AbstractNextPossibleTokensWalker extends RestWalker {
  protected possibleTokTypes: TokenType[] = [];
  protected ruleStack: string[];
  protected occurrenceStack: number[];

  protected nextProductionName = "";
  protected nextProductionOccurrence = 0;
  protected found = false;
  protected isAtEndOfPath = false;

  constructor(
    protected topProd: Rule,
    protected path: IGrammarPath,
  ) {
    super();
  }

  startWalking(): TokenType[] {
    this.found = false;

    if (this.path.ruleStack[0] !== this.topProd.name) {
      throw Error("The path does not start with the walker's top Rule!");
    }

    // immutable for the win
    this.ruleStack = clone(this.path.ruleStack).reverse(); // intelij bug requires assertion
    this.occurrenceStack = clone(this.path.occurrenceStack).reverse(); // intelij bug requires assertion

    // already verified that the first production is valid, we now seek the 2nd production
    this.ruleStack.pop();
    this.occurrenceStack.pop();

    this.updateExpectedNext();
    this.walk(this.topProd);

    return this.possibleTokTypes;
  }

  walk(
    prod: { definition: IProduction[] },
    prevRest: IProduction[] = [],
  ): void {
    // stop scanning once we found the path
    if (!this.found) {
      super.walk(prod, prevRest);
    }
  }

  walkProdRef(
    refProd: NonTerminal,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // found the next production, need to keep walking in it
    if (
      refProd.referencedRule.name === this.nextProductionName &&
      refProd.idx === this.nextProductionOccurrence
    ) {
      const fullRest = currRest.concat(prevRest);
      this.updateExpectedNext();
      this.walk(refProd.referencedRule, <any>fullRest);
    }
  }

  updateExpectedNext(): void {
    // need to consume the Terminal
    if (isEmpty(this.ruleStack)) {
      // must reset nextProductionXXX to avoid walking down another Top Level production while what we are
      // really seeking is the last Terminal...
      this.nextProductionName = "";
      this.nextProductionOccurrence = 0;
      this.isAtEndOfPath = true;
    } else {
      this.nextProductionName = this.ruleStack.pop()!;
      this.nextProductionOccurrence = this.occurrenceStack.pop()!;
    }
  }
}

export class NextAfterTokenWalker extends AbstractNextPossibleTokensWalker {
  private nextTerminalName = "";
  private nextTerminalOccurrence = 0;

  constructor(
    topProd: Rule,
    protected path: ITokenGrammarPath,
  ) {
    super(topProd, path);
    this.nextTerminalName = this.path.lastTok.name;
    this.nextTerminalOccurrence = this.path.lastTokOccurrence;
  }

  walkTerminal(
    terminal: Terminal,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    if (
      this.isAtEndOfPath &&
      terminal.terminalType.name === this.nextTerminalName &&
      terminal.idx === this.nextTerminalOccurrence &&
      !this.found
    ) {
      const fullRest = currRest.concat(prevRest);
      const restProd = new Alternative({ definition: fullRest });
      this.possibleTokTypes = first(restProd);
      this.found = true;
    }
  }
}

export type AlternativesFirstTokens = TokenType[][];

export interface IFirstAfterRepetition {
  token: TokenType | undefined;
  occurrence: number | undefined;
  isEndOfRule: boolean | undefined;
}

/**
 * This walker only "walks" a single "TOP" level in the Grammar Ast, this means
 * it never "follows" production refs
 */
export class AbstractNextTerminalAfterProductionWalker extends RestWalker {
  protected result: IFirstAfterRepetition = {
    token: undefined,
    occurrence: undefined,
    isEndOfRule: undefined,
  };

  constructor(
    protected topRule: Rule,
    protected occurrence: number,
  ) {
    super();
  }

  startWalking(): IFirstAfterRepetition {
    this.walk(this.topRule);
    return this.result;
  }
}

export class NextTerminalAfterManyWalker extends AbstractNextTerminalAfterProductionWalker {
  walkMany(
    manyProd: Repetition,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    if (manyProd.idx === this.occurrence) {
      const firstAfterMany = _first(currRest.concat(prevRest));
      this.result.isEndOfRule = firstAfterMany === undefined;
      if (firstAfterMany instanceof Terminal) {
        this.result.token = firstAfterMany.terminalType;
        this.result.occurrence = firstAfterMany.idx;
      }
    } else {
      super.walkMany(manyProd, currRest, prevRest);
    }
  }
}

export class NextTerminalAfterManySepWalker extends AbstractNextTerminalAfterProductionWalker {
  walkManySep(
    manySepProd: RepetitionWithSeparator,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    if (manySepProd.idx === this.occurrence) {
      const firstAfterManySep = _first(currRest.concat(prevRest));
      this.result.isEndOfRule = firstAfterManySep === undefined;
      if (firstAfterManySep instanceof Terminal) {
        this.result.token = firstAfterManySep.terminalType;
        this.result.occurrence = firstAfterManySep.idx;
      }
    } else {
      super.walkManySep(manySepProd, currRest, prevRest);
    }
  }
}

export class NextTerminalAfterAtLeastOneWalker extends AbstractNextTerminalAfterProductionWalker {
  walkAtLeastOne(
    atLeastOneProd: RepetitionMandatory,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    if (atLeastOneProd.idx === this.occurrence) {
      const firstAfterAtLeastOne = _first(currRest.concat(prevRest));
      this.result.isEndOfRule = firstAfterAtLeastOne === undefined;
      if (firstAfterAtLeastOne instanceof Terminal) {
        this.result.token = firstAfterAtLeastOne.terminalType;
        this.result.occurrence = firstAfterAtLeastOne.idx;
      }
    } else {
      super.walkAtLeastOne(atLeastOneProd, currRest, prevRest);
    }
  }
}

// TODO: reduce code duplication in the AfterWalkers
export class NextTerminalAfterAtLeastOneSepWalker extends AbstractNextTerminalAfterProductionWalker {
  walkAtLeastOneSep(
    atleastOneSepProd: RepetitionMandatoryWithSeparator,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    if (atleastOneSepProd.idx === this.occurrence) {
      const firstAfterfirstAfterAtLeastOneSep = _first(
        currRest.concat(prevRest),
      );
      this.result.isEndOfRule = firstAfterfirstAfterAtLeastOneSep === undefined;
      if (firstAfterfirstAfterAtLeastOneSep instanceof Terminal) {
        this.result.token = firstAfterfirstAfterAtLeastOneSep.terminalType;
        this.result.occurrence = firstAfterfirstAfterAtLeastOneSep.idx;
      }
    } else {
      super.walkAtLeastOneSep(atleastOneSepProd, currRest, prevRest);
    }
  }
}

export interface PartialPathAndSuffixes {
  partialPath: TokenType[];
  suffixDef: IProduction[];
}

export function possiblePathsFrom(
  targetDef: IProduction[],
  maxLength: number,
  currPath: TokenType[] = [],
): PartialPathAndSuffixes[] {
  // avoid side effects
  currPath = clone(currPath);
  let result: PartialPathAndSuffixes[] = [];
  let i = 0;

  // TODO: avoid inner funcs
  function remainingPathWith(nextDef: IProduction[]) {
    return nextDef.concat(drop(targetDef, i + 1));
  }

  // TODO: avoid inner funcs
  function getAlternativesForProd(definition: IProduction[]) {
    const alternatives = possiblePathsFrom(
      remainingPathWith(definition),
      maxLength,
      currPath,
    );
    return result.concat(alternatives);
  }

  /**
   * Mandatory productions will halt the loop as the paths computed from their recursive calls will already contain the
   * following (rest) of the targetDef.
   *
   * For optional productions (Option/Repetition/...) the loop will continue to represent the paths that do not include the
   * the optional production.
   */
  while (currPath.length < maxLength && i < targetDef.length) {
    const prod = targetDef[i];

    /* istanbul ignore else */
    if (prod instanceof Alternative) {
      return getAlternativesForProd(prod.definition);
    } else if (prod instanceof NonTerminal) {
      return getAlternativesForProd(prod.definition);
    } else if (prod instanceof Option) {
      result = getAlternativesForProd(prod.definition);
    } else if (prod instanceof RepetitionMandatory) {
      const newDef = prod.definition.concat([
        new Repetition({
          definition: prod.definition,
        }),
      ]);
      return getAlternativesForProd(newDef);
    } else if (prod instanceof RepetitionMandatoryWithSeparator) {
      const newDef = [
        new Alternative({ definition: prod.definition }),
        new Repetition({
          definition: [new Terminal({ terminalType: prod.separator })].concat(
            <any>prod.definition,
          ),
        }),
      ];
      return getAlternativesForProd(newDef);
    } else if (prod instanceof RepetitionWithSeparator) {
      const newDef = prod.definition.concat([
        new Repetition({
          definition: [new Terminal({ terminalType: prod.separator })].concat(
            <any>prod.definition,
          ),
        }),
      ]);
      result = getAlternativesForProd(newDef);
    } else if (prod instanceof Repetition) {
      const newDef = prod.definition.concat([
        new Repetition({
          definition: prod.definition,
        }),
      ]);
      result = getAlternativesForProd(newDef);
    } else if (prod instanceof Alternation) {
      forEach(prod.definition, (currAlt) => {
        // TODO: this is a limited check for empty alternatives
        //   It would prevent a common case of infinite loops during parser initialization.
        //   However **in-directly** empty alternatives may still cause issues.
        if (isEmpty(currAlt.definition) === false) {
          result = getAlternativesForProd(currAlt.definition);
        }
      });
      return result;
    } else if (prod instanceof Terminal) {
      currPath.push(prod.terminalType);
    } else {
      throw Error("non exhaustive match");
    }

    i++;
  }
  result.push({
    partialPath: currPath,
    suffixDef: drop(targetDef, i),
  });

  return result;
}

interface IPathToExamine {
  idx: number;
  def: IProduction[];
  ruleStack: string[];
  occurrenceStack: number[];
}

export function nextPossibleTokensAfter(
  initialDef: IProduction[],
  tokenVector: IToken[],
  tokMatcher: TokenMatcher,
  maxLookAhead: number,
): ISyntacticContentAssistPath[] {
  const EXIT_NON_TERMINAL: any = "EXIT_NONE_TERMINAL";
  // to avoid creating a new Array each time.
  const EXIT_NON_TERMINAL_ARR = [EXIT_NON_TERMINAL];
  const EXIT_ALTERNATIVE: any = "EXIT_ALTERNATIVE";
  let foundCompletePath = false;

  const tokenVectorLength = tokenVector.length;
  const minimalAlternativesIndex = tokenVectorLength - maxLookAhead - 1;

  const result: ISyntacticContentAssistPath[] = [];

  const possiblePaths: IPathToExamine[] = [];
  possiblePaths.push({
    idx: -1,
    def: initialDef,
    ruleStack: [],
    occurrenceStack: [],
  });

  while (!isEmpty(possiblePaths)) {
    const currPath = possiblePaths.pop()!;

    // skip alternatives if no more results can be found (assuming deterministic grammar with fixed lookahead)
    if (currPath === EXIT_ALTERNATIVE) {
      if (
        foundCompletePath &&
        last(possiblePaths)!.idx <= minimalAlternativesIndex
      ) {
        // remove irrelevant alternative
        possiblePaths.pop();
      }
      continue;
    }

    const currDef = currPath.def;
    const currIdx = currPath.idx;
    const currRuleStack = currPath.ruleStack;
    const currOccurrenceStack = currPath.occurrenceStack;

    // For Example: an empty path could exist in a valid grammar in the case of an EMPTY_ALT
    if (isEmpty(currDef)) {
      continue;
    }

    const prod = currDef[0];
    /* istanbul ignore else */
    if (prod === EXIT_NON_TERMINAL) {
      const nextPath = {
        idx: currIdx,
        def: drop(currDef),
        ruleStack: dropRight(currRuleStack),
        occurrenceStack: dropRight(currOccurrenceStack),
      };
      possiblePaths.push(nextPath);
    } else if (prod instanceof Terminal) {
      /* istanbul ignore else */
      if (currIdx < tokenVectorLength - 1) {
        const nextIdx = currIdx + 1;
        const actualToken = tokenVector[nextIdx];
        if (tokMatcher!(actualToken, prod.terminalType)) {
          const nextPath = {
            idx: nextIdx,
            def: drop(currDef),
            ruleStack: currRuleStack,
            occurrenceStack: currOccurrenceStack,
          };
          possiblePaths.push(nextPath);
        }
        // end of the line
      } else if (currIdx === tokenVectorLength - 1) {
        // IGNORE ABOVE ELSE
        result.push({
          nextTokenType: prod.terminalType,
          nextTokenOccurrence: prod.idx,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack,
        });
        foundCompletePath = true;
      } else {
        throw Error("non exhaustive match");
      }
    } else if (prod instanceof NonTerminal) {
      const newRuleStack = clone(currRuleStack);
      newRuleStack.push(prod.nonTerminalName);

      const newOccurrenceStack = clone(currOccurrenceStack);
      newOccurrenceStack.push(prod.idx);

      const nextPath = {
        idx: currIdx,
        def: prod.definition.concat(EXIT_NON_TERMINAL_ARR, drop(currDef)),
        ruleStack: newRuleStack,
        occurrenceStack: newOccurrenceStack,
      };
      possiblePaths.push(nextPath);
    } else if (prod instanceof Option) {
      // the order of alternatives is meaningful, FILO (Last path will be traversed first).
      const nextPathWithout = {
        idx: currIdx,
        def: drop(currDef),
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPathWithout);
      // required marker to avoid backtracking paths whose higher priority alternatives already matched
      possiblePaths.push(EXIT_ALTERNATIVE);

      const nextPathWith = {
        idx: currIdx,
        def: prod.definition.concat(drop(currDef)),
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPathWith);
    } else if (prod instanceof RepetitionMandatory) {
      // TODO:(THE NEW operators here take a while...) (convert once?)
      const secondIteration = new Repetition({
        definition: prod.definition,
        idx: prod.idx,
      });
      const nextDef = prod.definition.concat([secondIteration], drop(currDef));
      const nextPath = {
        idx: currIdx,
        def: nextDef,
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPath);
    } else if (prod instanceof RepetitionMandatoryWithSeparator) {
      // TODO:(THE NEW operators here take a while...) (convert once?)
      const separatorGast = new Terminal({
        terminalType: prod.separator,
      });
      const secondIteration = new Repetition({
        definition: [<any>separatorGast].concat(prod.definition),
        idx: prod.idx,
      });
      const nextDef = prod.definition.concat([secondIteration], drop(currDef));
      const nextPath = {
        idx: currIdx,
        def: nextDef,
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPath);
    } else if (prod instanceof RepetitionWithSeparator) {
      // the order of alternatives is meaningful, FILO (Last path will be traversed first).
      const nextPathWithout = {
        idx: currIdx,
        def: drop(currDef),
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPathWithout);
      // required marker to avoid backtracking paths whose higher priority alternatives already matched
      possiblePaths.push(EXIT_ALTERNATIVE);

      const separatorGast = new Terminal({
        terminalType: prod.separator,
      });
      const nthRepetition = new Repetition({
        definition: [<any>separatorGast].concat(prod.definition),
        idx: prod.idx,
      });
      const nextDef = prod.definition.concat([nthRepetition], drop(currDef));
      const nextPathWith = {
        idx: currIdx,
        def: nextDef,
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPathWith);
    } else if (prod instanceof Repetition) {
      // the order of alternatives is meaningful, FILO (Last path will be traversed first).
      const nextPathWithout = {
        idx: currIdx,
        def: drop(currDef),
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPathWithout);
      // required marker to avoid backtracking paths whose higher priority alternatives already matched
      possiblePaths.push(EXIT_ALTERNATIVE);

      // TODO: an empty repetition will cause infinite loops here, will the parser detect this in selfAnalysis?
      const nthRepetition = new Repetition({
        definition: prod.definition,
        idx: prod.idx,
      });
      const nextDef = prod.definition.concat([nthRepetition], drop(currDef));
      const nextPathWith = {
        idx: currIdx,
        def: nextDef,
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      };
      possiblePaths.push(nextPathWith);
    } else if (prod instanceof Alternation) {
      // the order of alternatives is meaningful, FILO (Last path will be traversed first).
      for (let i = prod.definition.length - 1; i >= 0; i--) {
        const currAlt: any = prod.definition[i];
        const currAltPath = {
          idx: currIdx,
          def: currAlt.definition.concat(drop(currDef)),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack,
        };
        possiblePaths.push(currAltPath);
        possiblePaths.push(EXIT_ALTERNATIVE);
      }
    } else if (prod instanceof Alternative) {
      possiblePaths.push({
        idx: currIdx,
        def: prod.definition.concat(drop(currDef)),
        ruleStack: currRuleStack,
        occurrenceStack: currOccurrenceStack,
      });
    } else if (prod instanceof Rule) {
      // last because we should only encounter at most a single one of these per invocation.
      possiblePaths.push(
        expandTopLevelRule(prod, currIdx, currRuleStack, currOccurrenceStack),
      );
    } else {
      throw Error("non exhaustive match");
    }
  }
  return result;
}

function expandTopLevelRule(
  topRule: Rule,
  currIdx: number,
  currRuleStack: string[],
  currOccurrenceStack: number[],
): IPathToExamine {
  const newRuleStack = clone(currRuleStack);
  newRuleStack.push(topRule.name);

  const newCurrOccurrenceStack = clone(currOccurrenceStack);
  // top rule is always assumed to have been called with occurrence index 1
  newCurrOccurrenceStack.push(1);

  return {
    idx: currIdx,
    def: topRule.definition,
    ruleStack: newRuleStack,
    occurrenceStack: newCurrOccurrenceStack,
  };
}
