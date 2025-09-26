import { LruMap } from './LruMap';
export declare class LruTtlMap<K, V> extends LruMap<K, V> {
    private readonly expiry;
    clear(): void;
    delete(key: K): boolean;
    has(key: K, now?: number): boolean;
    get(key: K, now?: number): V | undefined;
    set(key: K, value: V, expiry?: number): this;
}
