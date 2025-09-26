import { drop, forEach } from "lodash-es";
import {
  Alternation,
  Alternative,
  NonTerminal,
  Option,
  Repetition,
  RepetitionMandatory,
  RepetitionMandatoryWithSeparator,
  RepetitionWithSeparator,
  Terminal,
} from "@chevrotain/gast";
import { IProduction } from "@chevrotain/types";

/**
 *  A Grammar Walker that computes the "remaining" grammar "after" a productions in the grammar.
 */
export abstract class RestWalker {
  walk(prod: { definition: IProduction[] }, prevRest: any[] = []): void {
    forEach(prod.definition, (subProd: IProduction, index) => {
      const currRest = drop(prod.definition, index + 1);
      /* istanbul ignore else */
      if (subProd instanceof NonTerminal) {
        this.walkProdRef(subProd, currRest, prevRest);
      } else if (subProd instanceof Terminal) {
        this.walkTerminal(subProd, currRest, prevRest);
      } else if (subProd instanceof Alternative) {
        this.walkFlat(subProd, currRest, prevRest);
      } else if (subProd instanceof Option) {
        this.walkOption(subProd, currRest, prevRest);
      } else if (subProd instanceof RepetitionMandatory) {
        this.walkAtLeastOne(subProd, currRest, prevRest);
      } else if (subProd instanceof RepetitionMandatoryWithSeparator) {
        this.walkAtLeastOneSep(subProd, currRest, prevRest);
      } else if (subProd instanceof RepetitionWithSeparator) {
        this.walkManySep(subProd, currRest, prevRest);
      } else if (subProd instanceof Repetition) {
        this.walkMany(subProd, currRest, prevRest);
      } else if (subProd instanceof Alternation) {
        this.walkOr(subProd, currRest, prevRest);
      } else {
        throw Error("non exhaustive match");
      }
    });
  }

  walkTerminal(
    terminal: Terminal,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {}

  walkProdRef(
    refProd: NonTerminal,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {}

  walkFlat(
    flatProd: Alternative,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABCDEF => after the D the rest is EF
    const fullOrRest = currRest.concat(prevRest);
    this.walk(flatProd, <any>fullOrRest);
  }

  walkOption(
    optionProd: Option,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABC(DE)?F => after the (DE)? the rest is F
    const fullOrRest = currRest.concat(prevRest);
    this.walk(optionProd, <any>fullOrRest);
  }

  walkAtLeastOne(
    atLeastOneProd: RepetitionMandatory,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABC(DE)+F => after the (DE)+ the rest is (DE)?F
    const fullAtLeastOneRest: IProduction[] = [
      new Option({ definition: atLeastOneProd.definition }),
    ].concat(<any>currRest, <any>prevRest);
    this.walk(atLeastOneProd, fullAtLeastOneRest);
  }

  walkAtLeastOneSep(
    atLeastOneSepProd: RepetitionMandatoryWithSeparator,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABC DE(,DE)* F => after the (,DE)+ the rest is (,DE)?F
    const fullAtLeastOneSepRest = restForRepetitionWithSeparator(
      atLeastOneSepProd,
      currRest,
      prevRest,
    );
    this.walk(atLeastOneSepProd, fullAtLeastOneSepRest);
  }

  walkMany(
    manyProd: Repetition,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABC(DE)*F => after the (DE)* the rest is (DE)?F
    const fullManyRest: IProduction[] = [
      new Option({ definition: manyProd.definition }),
    ].concat(<any>currRest, <any>prevRest);
    this.walk(manyProd, fullManyRest);
  }

  walkManySep(
    manySepProd: RepetitionWithSeparator,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABC (DE(,DE)*)? F => after the (,DE)* the rest is (,DE)?F
    const fullManySepRest = restForRepetitionWithSeparator(
      manySepProd,
      currRest,
      prevRest,
    );
    this.walk(manySepProd, fullManySepRest);
  }

  walkOr(
    orProd: Alternation,
    currRest: IProduction[],
    prevRest: IProduction[],
  ): void {
    // ABC(D|E|F)G => when finding the (D|E|F) the rest is G
    const fullOrRest = currRest.concat(prevRest);
    // walk all different alternatives
    forEach(orProd.definition, (alt) => {
      // wrapping each alternative in a single definition wrapper
      // to avoid errors in computing the rest of that alternative in the invocation to computeInProdFollows
      // (otherwise for OR([alt1,alt2]) alt2 will be considered in 'rest' of alt1
      const prodWrapper = new Alternative({ definition: [alt] });
      this.walk(prodWrapper, <any>fullOrRest);
    });
  }
}

function restForRepetitionWithSeparator(
  repSepProd: RepetitionWithSeparator,
  currRest: IProduction[],
  prevRest: IProduction[],
) {
  const repSepRest = [
    new Option({
      definition: [
        new Terminal({ terminalType: repSepProd.separator }) as IProduction,
      ].concat(repSepProd.definition),
    }) as IProduction,
  ];
  const fullRepSepRest: IProduction[] = repSepRest.concat(currRest, prevRest);
  return fullRepSepRest;
}
