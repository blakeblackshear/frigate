import { Token } from './string';
type JsonValue = unknown;
export type NodeType = 'null' | 'boolean' | 'number' | 'string' | 'binary' | 'array' | 'object';
export interface NodeOdds {
    null: number;
    boolean: number;
    number: number;
    string: number;
    binary: number;
    array: number;
    object: number;
}
export interface RandomJsonOptions {
    rootNode: 'object' | 'array' | 'string' | undefined;
    nodeCount: number;
    odds: NodeOdds;
    strings?: Token;
}
type ContainerNode = unknown[] | object;
export declare class RandomJson {
    static generate(opts?: Partial<RandomJsonOptions>): JsonValue;
    static genBoolean(): boolean;
    static genNumber(): number;
    static genString(length?: number): string;
    static genBinary(length?: number): Uint8Array;
    static genArray(options?: Partial<Omit<RandomJsonOptions, 'rootNode'>>): unknown[];
    static genObject(options?: Partial<Omit<RandomJsonOptions, 'rootNode'>>): object;
    opts: RandomJsonOptions;
    private totalOdds;
    private oddTotals;
    root: JsonValue;
    private containers;
    constructor(opts?: Partial<RandomJsonOptions>);
    create(): JsonValue;
    addNode(): void;
    protected generate(type: NodeType): unknown;
    protected generateString(): string;
    pickNodeType(): NodeType;
    protected pickContainerType(): 'array' | 'object';
    protected pickContainer(): ContainerNode;
}
export {};
