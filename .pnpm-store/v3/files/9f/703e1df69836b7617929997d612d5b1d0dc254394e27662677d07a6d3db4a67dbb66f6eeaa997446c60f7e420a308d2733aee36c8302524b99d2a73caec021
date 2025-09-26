import type { IGASTVisitor, IProduction, IProductionWithOccurrence, ISerializedGast, TokenType } from "@chevrotain/types";
export declare abstract class AbstractProduction<T extends IProduction = IProduction> implements IProduction {
    protected _definition: T[];
    get definition(): T[];
    set definition(value: T[]);
    constructor(_definition: T[]);
    accept(visitor: IGASTVisitor): void;
}
export declare class NonTerminal extends AbstractProduction implements IProductionWithOccurrence {
    nonTerminalName: string;
    label?: string;
    referencedRule: Rule;
    idx: number;
    constructor(options: {
        nonTerminalName: string;
        label?: string;
        referencedRule?: Rule;
        idx?: number;
    });
    set definition(definition: IProduction[]);
    get definition(): IProduction[];
    accept(visitor: IGASTVisitor): void;
}
export declare class Rule extends AbstractProduction {
    name: string;
    orgText: string;
    constructor(options: {
        name: string;
        definition: IProduction[];
        orgText?: string;
    });
}
export declare class Alternative extends AbstractProduction {
    ignoreAmbiguities: boolean;
    constructor(options: {
        definition: IProduction[];
        ignoreAmbiguities?: boolean;
    });
}
export declare class Option extends AbstractProduction implements IProductionWithOccurrence {
    idx: number;
    maxLookahead?: number;
    constructor(options: {
        definition: IProduction[];
        idx?: number;
        maxLookahead?: number;
    });
}
export declare class RepetitionMandatory extends AbstractProduction implements IProductionWithOccurrence {
    idx: number;
    maxLookahead?: number;
    constructor(options: {
        definition: IProduction[];
        idx?: number;
        maxLookahead?: number;
    });
}
export declare class RepetitionMandatoryWithSeparator extends AbstractProduction implements IProductionWithOccurrence {
    separator: TokenType;
    idx: number;
    maxLookahead?: number;
    constructor(options: {
        definition: IProduction[];
        separator: TokenType;
        idx?: number;
    });
}
export declare class Repetition extends AbstractProduction implements IProductionWithOccurrence {
    separator: TokenType;
    idx: number;
    maxLookahead?: number;
    constructor(options: {
        definition: IProduction[];
        idx?: number;
        maxLookahead?: number;
    });
}
export declare class RepetitionWithSeparator extends AbstractProduction implements IProductionWithOccurrence {
    separator: TokenType;
    idx: number;
    maxLookahead?: number;
    constructor(options: {
        definition: IProduction[];
        separator: TokenType;
        idx?: number;
    });
}
export declare class Alternation extends AbstractProduction<Alternative> implements IProductionWithOccurrence {
    idx: number;
    ignoreAmbiguities: boolean;
    hasPredicates: boolean;
    maxLookahead?: number;
    get definition(): Alternative[];
    set definition(value: Alternative[]);
    constructor(options: {
        definition: Alternative[];
        idx?: number;
        ignoreAmbiguities?: boolean;
        hasPredicates?: boolean;
        maxLookahead?: number;
    });
}
export declare class Terminal implements IProductionWithOccurrence {
    terminalType: TokenType;
    label?: string;
    idx: number;
    constructor(options: {
        terminalType: TokenType;
        label?: string;
        idx?: number;
    });
    accept(visitor: IGASTVisitor): void;
}
export interface ISerializedBasic extends ISerializedGast {
    type: "Alternative" | "Option" | "RepetitionMandatory" | "Repetition" | "Alternation";
    idx?: number;
}
export interface ISerializedGastRule extends ISerializedGast {
    type: "Rule";
    name: string;
    orgText: string;
}
export interface ISerializedNonTerminal extends ISerializedGast {
    type: "NonTerminal";
    name: string;
    label?: string;
    idx: number;
}
export interface ISerializedTerminal extends ISerializedGast {
    type: "Terminal";
    name: string;
    terminalLabel?: string;
    label?: string;
    pattern?: string;
    idx: number;
}
export interface ISerializedTerminalWithSeparator extends ISerializedGast {
    type: "RepetitionMandatoryWithSeparator" | "RepetitionWithSeparator";
    idx: number;
    separator: ISerializedTerminal;
}
export type ISerializedGastAny = ISerializedBasic | ISerializedGastRule | ISerializedNonTerminal | ISerializedTerminal | ISerializedTerminalWithSeparator;
export declare function serializeGrammar(topRules: Rule[]): ISerializedGast[];
export declare function serializeProduction(node: IProduction): ISerializedGast;
