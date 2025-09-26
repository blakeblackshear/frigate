export declare class LruCache<V> {
    protected readonly limit: number;
    protected capacity: number;
    protected head: LruNode<V> | undefined;
    protected tail: LruNode<V> | undefined;
    protected map: Record<string, LruNode<V>>;
    constructor(limit?: number);
    get size(): number;
    set(key: string, value: V): void;
    get(key: string): V | undefined;
    peek(key: string): V | undefined;
    has(key: string): boolean;
    clear(): void;
    keys(): string[];
    del(key: string): boolean;
    protected pop(node: LruNode<V>): void;
    protected push(node: LruNode<V>): void;
}
declare class LruNode<V> {
    readonly k: string;
    v: V;
    l: LruNode<V> | undefined;
    r: LruNode<V> | undefined;
    constructor(k: string, v: V);
}
export {};
