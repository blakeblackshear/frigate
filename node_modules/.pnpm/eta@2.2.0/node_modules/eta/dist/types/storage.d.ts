/**
 * Handles storage and accessing of values
 *
 * In this case, we use it to store compiled template functions
 * Indexed by their `name` or `filename`
 */
declare class Cacher<T> {
    private cache;
    constructor(cache: Record<string, T>);
    define(key: string, val: T): void;
    get(key: string): T;
    remove(key: string): void;
    reset(): void;
    load(cacheObj: Record<string, T>): void;
}
export { Cacher };
//# sourceMappingURL=storage.d.ts.map