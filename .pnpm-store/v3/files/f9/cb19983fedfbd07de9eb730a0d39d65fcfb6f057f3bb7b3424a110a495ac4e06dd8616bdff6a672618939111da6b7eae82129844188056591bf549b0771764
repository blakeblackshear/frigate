export declare class CompressionTable {
    static create(value: unknown): CompressionTable;
    protected integers: Set<number>;
    protected nonIntegers: Set<unknown>;
    protected table: unknown[];
    protected map: Map<unknown, number>;
    addInteger(int: number): void;
    addLiteral(value: number | string | unknown): void;
    walk(value: unknown): void;
    finalize(): void;
    getIndex(value: unknown): number;
    getTable(): unknown[];
    compress(value: unknown): unknown;
}
