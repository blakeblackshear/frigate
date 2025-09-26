export interface CacheEntry<T> {
    t: number;
    value: T;
}
export declare class Cache<T> {
    method: (key: string) => Promise<T>;
    ttl: number;
    evictionTime: number;
    gcPeriod: number;
    maxEntries: number;
    private entries;
    map: Map<string, CacheEntry<T>>;
    private timer;
    constructor(method?: (key: string) => Promise<T>);
    put(key: string, value: T): void;
    getFromSource(key: string): Promise<T>;
    get(key: string): Promise<T>;
    getSync(key: string): T | null;
    exists(key: string): boolean;
    scheduleGC(): void;
    startGC(): void;
    runGC: () => void;
    stopGC: () => void;
    retire(key: string, newTime?: number): boolean;
    remove(key: string): boolean;
}
