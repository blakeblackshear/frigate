/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Stream } from './stream.js';
import { Reduction, stream } from './stream.js';

/**
 * A multimap is a variation of a Map that has potentially multiple values for every key.
 */
export class MultiMap<K, V> {

    private map = new Map<K, V[]>();

    constructor()
    constructor(elements: Array<[K, V]>)
    constructor(elements?: Array<[K, V]>) {
        if (elements) {
            for (const [key, value] of elements) {
                this.add(key, value);
            }
        }
    }

    /**
     * The total number of values in the multimap.
     */
    get size(): number {
        return Reduction.sum(stream(this.map.values()).map(a => a.length));
    }

    /**
     * Clear all entries in the multimap.
     */
    clear(): void {
        this.map.clear();
    }

    /**
     * Operates differently depending on whether a `value` is given:
     *  * With a value, this method deletes the specific key / value pair from the multimap.
     *  * Without a value, all values associated with the given key are deleted.
     *
     * @returns `true` if a value existed and has been removed, or `false` if the specified
     *     key / value does not exist.
     */
    delete(key: K, value?: V): boolean {
        if (value === undefined) {
            return this.map.delete(key);
        } else {
            const values = this.map.get(key);
            if (values) {
                const index = values.indexOf(value);
                if (index >= 0) {
                    if (values.length === 1) {
                        this.map.delete(key);
                    } else {
                        values.splice(index, 1);
                    }
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Returns an array of all values associated with the given key. If no value exists,
     * an empty array is returned.
     *
     * _Note:_ The returned array is assumed not to be modified. Use the `set` method to add a
     * value and `delete` to remove a value from the multimap.
     */
    get(key: K): readonly V[] {
        return this.map.get(key) ?? [];
    }

    /**
     * Operates differently depending on whether a `value` is given:
     *  * With a value, this method returns `true` if the specific key / value pair is present in the multimap.
     *  * Without a value, this method returns `true` if the given key is present in the multimap.
     */
    has(key: K, value?: V): boolean {
        if (value === undefined) {
            return this.map.has(key);
        } else {
            const values = this.map.get(key);
            if (values) {
                return values.indexOf(value) >= 0;
            }
            return false;
        }
    }

    /**
     * Add the given key / value pair to the multimap.
     */
    add(key: K, value: V): this {
        if (this.map.has(key)) {
            this.map.get(key)!.push(value);
        } else {
            this.map.set(key, [value]);
        }
        return this;
    }

    /**
     * Add the given set of key / value pairs to the multimap.
     */
    addAll(key: K, values: Iterable<V>): this {
        if (this.map.has(key)) {
            this.map.get(key)!.push(...values);
        } else {
            this.map.set(key, Array.from(values));
        }
        return this;
    }

    /**
     * Invokes the given callback function for every key / value pair in the multimap.
     */
    forEach(callbackfn: (value: V, key: K, map: this) => void): void {
        this.map.forEach((array, key) =>
            array.forEach(value => callbackfn(value, key, this))
        );
    }

    /**
     * Returns an iterator of key, value pairs for every entry in the map.
     */
    [Symbol.iterator](): Iterator<[K, V]> {
        return this.entries().iterator();
    }

    /**
     * Returns a stream of key, value pairs for every entry in the map.
     */
    entries(): Stream<[K, V]> {
        return stream(this.map.entries())
            .flatMap(([key, array]) => array.map(value => [key, value] as [K, V]));
    }

    /**
     * Returns a stream of keys in the map.
     */
    keys(): Stream<K> {
        return stream(this.map.keys());
    }

    /**
     * Returns a stream of values in the map.
     */
    values(): Stream<V> {
        return stream(this.map.values()).flat();
    }

    /**
     * Returns a stream of key, value set pairs for every key in the map.
     */
    entriesGroupedByKey(): Stream<[K, V[]]> {
        return stream(this.map.entries());
    }

}

export class BiMap<K, V> {

    private map = new Map<K, V>();
    private inverse = new Map<V, K>();

    get size(): number {
        return this.map.size;
    }

    constructor()
    constructor(elements: Array<[K, V]>)
    constructor(elements?: Array<[K, V]>) {
        if (elements) {
            for (const [key, value] of elements) {
                this.set(key, value);
            }
        }
    }

    clear(): void {
        this.map.clear();
        this.inverse.clear();
    }

    set(key: K, value: V): this {
        this.map.set(key, value);
        this.inverse.set(value, key);
        return this;
    }

    get(key: K): V | undefined {
        return this.map.get(key);
    }

    getKey(value: V): K | undefined {
        return this.inverse.get(value);
    }

    delete(key: K): boolean {
        const value = this.map.get(key);
        if (value !== undefined) {
            this.map.delete(key);
            this.inverse.delete(value);
            return true;
        }
        return false;
    }
}
