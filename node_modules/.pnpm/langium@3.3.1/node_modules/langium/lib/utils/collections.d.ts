/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Stream } from './stream.js';
/**
 * A multimap is a variation of a Map that has potentially multiple values for every key.
 */
export declare class MultiMap<K, V> {
    private map;
    constructor();
    constructor(elements: Array<[K, V]>);
    /**
     * The total number of values in the multimap.
     */
    get size(): number;
    /**
     * Clear all entries in the multimap.
     */
    clear(): void;
    /**
     * Operates differently depending on whether a `value` is given:
     *  * With a value, this method deletes the specific key / value pair from the multimap.
     *  * Without a value, all values associated with the given key are deleted.
     *
     * @returns `true` if a value existed and has been removed, or `false` if the specified
     *     key / value does not exist.
     */
    delete(key: K, value?: V): boolean;
    /**
     * Returns an array of all values associated with the given key. If no value exists,
     * an empty array is returned.
     *
     * _Note:_ The returned array is assumed not to be modified. Use the `set` method to add a
     * value and `delete` to remove a value from the multimap.
     */
    get(key: K): readonly V[];
    /**
     * Operates differently depending on whether a `value` is given:
     *  * With a value, this method returns `true` if the specific key / value pair is present in the multimap.
     *  * Without a value, this method returns `true` if the given key is present in the multimap.
     */
    has(key: K, value?: V): boolean;
    /**
     * Add the given key / value pair to the multimap.
     */
    add(key: K, value: V): this;
    /**
     * Add the given set of key / value pairs to the multimap.
     */
    addAll(key: K, values: Iterable<V>): this;
    /**
     * Invokes the given callback function for every key / value pair in the multimap.
     */
    forEach(callbackfn: (value: V, key: K, map: this) => void): void;
    /**
     * Returns an iterator of key, value pairs for every entry in the map.
     */
    [Symbol.iterator](): Iterator<[K, V]>;
    /**
     * Returns a stream of key, value pairs for every entry in the map.
     */
    entries(): Stream<[K, V]>;
    /**
     * Returns a stream of keys in the map.
     */
    keys(): Stream<K>;
    /**
     * Returns a stream of values in the map.
     */
    values(): Stream<V>;
    /**
     * Returns a stream of key, value set pairs for every key in the map.
     */
    entriesGroupedByKey(): Stream<[K, V[]]>;
}
export declare class BiMap<K, V> {
    private map;
    private inverse;
    get size(): number;
    constructor();
    constructor(elements: Array<[K, V]>);
    clear(): void;
    set(key: K, value: V): this;
    get(key: K): V | undefined;
    getKey(value: V): K | undefined;
    delete(key: K): boolean;
}
//# sourceMappingURL=collections.d.ts.map