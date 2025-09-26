import { NonTerminal } from "./model.js";
import type { IProduction, IProductionWithOccurrence } from "@chevrotain/types";
export declare function isSequenceProd(prod: IProduction): prod is {
    definition: IProduction[];
} & IProduction;
export declare function isOptionalProd(prod: IProduction, alreadyVisited?: NonTerminal[]): boolean;
export declare function isBranchingProd(prod: IProduction): prod is {
    definition: IProduction[];
} & IProduction;
export declare function getProductionDslName(prod: IProductionWithOccurrence): string;
