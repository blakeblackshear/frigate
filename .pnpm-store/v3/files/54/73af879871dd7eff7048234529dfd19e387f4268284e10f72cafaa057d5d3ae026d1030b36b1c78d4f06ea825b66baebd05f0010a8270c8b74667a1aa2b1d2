/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
/**
 * A stream is a read-only sequence of values. While the contents of an array can be accessed
 * both sequentially and randomly (via index), a stream allows only sequential access.
 *
 * The advantage of this is that a stream can be evaluated lazily, so it does not require
 * to store intermediate values. This can boost performance when a large sequence is
 * processed via filtering, mapping etc. and accessed at most once. However, lazy
 * evaluation means that all processing is repeated when you access the sequence multiple
 * times; in such a case, it may be better to store the resulting sequence into an array.
 */
export interface Stream<T> extends Iterable<T> {
    /**
     * Returns an iterator for this stream. This is the same as calling the `Symbol.iterator` function property.
     */
    iterator(): IterableIterator<T>;
    /**
     * Determines whether this stream contains no elements.
     */
    isEmpty(): boolean;
    /**
     * Determines the number of elements in this stream.
     */
    count(): number;
    /**
     * Collects all elements of this stream into an array.
     */
    toArray(): T[];
    /**
     * Collects all elements of this stream into a Set.
     */
    toSet(): Set<T>;
    /**
     * Collects all elements of this stream into a Map, applying the provided functions to determine keys and values.
     *
     * @param keyFn The function to derive map keys. If omitted, the stream elements are used as keys.
     * @param valueFn The function to derive map values. If omitted, the stream elements are used as values.
     */
    toMap<K = T, V = T>(keyFn?: (e: T) => K, valueFn?: (e: T) => V): Map<K, V>;
    /**
     * Returns a string representation of a stream.
     */
    toString(): string;
    /**
     * Combines two streams by returning a new stream that yields all elements of this stream and the other stream.
     *
     * @param other Stream to be concatenated with this one.
     */
    concat<T2>(other: Iterable<T2>): Stream<T | T2>;
    /**
     * Adds all elements of the stream into a string, separated by the specified separator string.
     *
     * @param separator A string used to separate one element of the stream from the next in the resulting string.
     *        If omitted, the steam elements are separated with a comma.
     */
    join(separator?: string): string;
    /**
     * Returns the index of the first occurrence of a value in the stream, or -1 if it is not present.
     *
     * @param searchElement The value to locate in the array.
     * @param fromIndex The stream index at which to begin the search. If fromIndex is omitted, the search
     *        starts at index 0.
     */
    indexOf(searchElement: T, fromIndex?: number): number;
    /**
     * Determines whether all members of the stream satisfy the specified test.
     *
     * @param predicate This method calls the predicate function for each element in the stream until the
     *        predicate returns a value which is coercible to the Boolean value `false`, or until the end
     *        of the stream.
     */
    every<S extends T>(predicate: (value: T) => value is S): this is Stream<S>;
    every(predicate: (value: T) => unknown): boolean;
    /**
     * Determines whether any member of the stream satisfies the specified test.
     *
     * @param predicate This method calls the predicate function for each element in the stream until the
     *        predicate returns a value which is coercible to the Boolean value `true`, or until the end
     *        of the stream.
     */
    some(predicate: (value: T) => unknown): boolean;
    /**
     * Performs the specified action for each element in the stream.
     *
     * @param callbackfn Function called once for each element in the stream.
     */
    forEach(callbackfn: (value: T, index: number) => void): void;
    /**
     * Returns a stream that yields the results of calling the specified callback function on each element
     * of the stream. The function is called when the resulting stream elements are actually accessed, so
     * accessing the resulting stream multiple times means the function is also called multiple times for
     * each element of the stream.
     *
     * @param callbackfn Lazily evaluated function mapping stream elements.
     */
    map<U>(callbackfn: (value: T) => U): Stream<U>;
    /**
     * Returns the elements of the stream that meet the condition specified in a callback function.
     * The function is called when the resulting stream elements are actually accessed, so accessing the
     * resulting stream multiple times means the function is also called multiple times for each element
     * of the stream.
     *
     * @param predicate Lazily evaluated function checking a condition on stream elements.
     */
    filter<S extends T>(predicate: (value: T) => value is S): Stream<S>;
    filter(predicate: (value: T) => unknown): Stream<T>;
    /**
     * Returns the elements of the stream that are _non-nullable_, which means they are neither `undefined`
     * nor `null`.
     */
    nonNullable(): Stream<NonNullable<T>>;
    /**
     * Calls the specified callback function for all elements in the stream. The return value of the
     * callback function is the accumulated result, and is provided as an argument in the next call to
     * the callback function.
     *
     * @param callbackfn This method calls the function once for each element in the stream, providing
     *        the previous and current values of the reduction.
     * @param initialValue If specified, `initialValue` is used as the initial value to start the
     *        accumulation. The first call to the function provides this value as an argument instead
     *        of a stream value.
     */
    reduce(callbackfn: (previousValue: T, currentValue: T) => T): T | undefined;
    reduce<U = T>(callbackfn: (previousValue: U, currentValue: T) => U, initialValue: U): U;
    /**
     * Calls the specified callback function for all elements in the stream, in descending order.
     * The return value of the callback function is the accumulated result, and is provided as an
     * argument in the next call to the callback function.
     *
     * @param callbackfn This method calls the function once for each element in the stream, providing
     *        the previous and current values of the reduction.
     * @param initialValue If specified, `initialValue` is used as the initial value to start the
     *        accumulation. The first call to the function provides this value as an argument instead
     *        of an array value.
     */
    reduceRight(callbackfn: (previousValue: T, currentValue: T) => T): T | undefined;
    reduceRight<U = T>(callbackfn: (previousValue: U, currentValue: T) => U, initialValue: U): U;
    /**
     * Returns the value of the first element in the stream that meets the condition, or `undefined`
     * if there is no such element.
     *
     * @param predicate This method calls `predicate` once for each element of the stream, in ascending
     *        order, until it finds one where `predicate` returns a value which is coercible to the
     *        Boolean value `true`.
     */
    find<S extends T>(predicate: (value: T) => value is S): S | undefined;
    find(predicate: (value: T) => unknown): T | undefined;
    /**
     * Returns the index of the first element in the stream that meets the condition, or `-1`
     * if there is no such element.
     *
     * @param predicate This method calls `predicate` once for each element of the stream, in ascending
     *        order, until it finds one where `predicate` returns a value which is coercible to the
     *        Boolean value `true`.
     */
    findIndex(predicate: (value: T) => unknown): number;
    /**
     * Determines whether the stream includes a certain element, returning `true` or `false` as appropriate.
     *
     * @param searchElement The element to search for.
     */
    includes(searchElement: T): boolean;
    /**
     * Calls a defined callback function on each element of the stream and then flattens the result into
     * a new stream. This is identical to a `map` followed by `flat` with depth 1.
     *
     * @param callbackfn Lazily evaluated function mapping stream elements.
     */
    flatMap<U>(callbackfn: (value: T) => U | Iterable<U>): Stream<U>;
    /**
     * Returns a new stream with all sub-stream or sub-array elements concatenated into it recursively up
     * to the specified depth.
     *
     * @param depth The maximum recursion depth. Defaults to 1.
     */
    flat<D extends number = 1>(depth?: D): FlatStream<T, D>;
    /**
     * Returns the first element in the stream, or `undefined` if the stream is empty.
     */
    head(): T | undefined;
    /**
     * Returns a stream that skips the first `skipCount` elements from this stream.
     *
     * @param skipCount The number of elements to skip. If this is larger than the number of elements in
     *        the stream, an empty stream is returned. Defaults to 1.
     */
    tail(skipCount?: number): Stream<T>;
    /**
     * Returns a stream consisting of the elements of this stream, truncated to be no longer than `maxSize`
     * in length.
     *
     * @param maxSize The number of elements the stream should be limited to
     */
    limit(maxSize: number): Stream<T>;
    /**
     * Returns a stream containing only the distinct elements from this stream.
     * Equality is determined with the same rules as a standard `Set`.
     *
     * @param by A function returning the key used to check equality with a previous stream element.
     *        If omitted, the stream elements themselves are used for comparison.
     */
    distinct<Key = T>(by?: (element: T) => Key): Stream<T>;
    /**
     * Returns a stream that contains all elements that don't exist in the {@link other} iterable.
     * Equality is determined with the same rules as a standard `Set`.
     * @param other The elements that should be exluded from this stream.
     * @param key A function returning the key used to check quality.
     *        If omitted, the stream elements themselves are used for comparison.
     */
    exclude<Key = T>(other: Iterable<T>, key?: (element: T) => Key): Stream<T>;
}
export type FlatStream<T, Depth extends number> = {
    'done': Stream<T>;
    'recur': T extends Iterable<infer Content> ? FlatStream<Content, MinusOne<Depth>> : Stream<T>;
}[Depth extends 0 ? 'done' : 'recur'];
export type MinusOne<N extends number> = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][N];
/**
 * The default implementation of `Stream` works with two input functions:
 *  - The first function creates the initial state of an iteration.
 *  - The second function gets the current state as argument and returns an `IteratorResult`.
 */
export declare class StreamImpl<S, T> implements Stream<T> {
    protected readonly startFn: () => S;
    protected readonly nextFn: (state: S) => IteratorResult<T>;
    constructor(startFn: () => S, nextFn: (state: S) => IteratorResult<T, undefined>);
    iterator(): IterableIterator<T>;
    [Symbol.iterator](): Iterator<T>;
    isEmpty(): boolean;
    count(): number;
    toArray(): T[];
    toSet(): Set<T>;
    toMap<K = T, V = T>(keyFn?: (e: T) => K, valueFn?: (e: T) => V): Map<K, V>;
    toString(): string;
    concat<T2>(other: Iterable<T2>): Stream<T | T2>;
    join(separator?: string): string;
    indexOf(searchElement: T, fromIndex?: number): number;
    every<U extends T>(predicate: (value: T) => value is U): this is Stream<U> & this;
    every(predicate: (value: T) => unknown): boolean;
    some(predicate: (value: T) => unknown): boolean;
    forEach(callbackfn: (value: T, index: number) => void): void;
    map<U>(callbackfn: (value: T) => U): Stream<U>;
    filter<U extends T>(predicate: (value: T) => value is U): Stream<U> & this;
    filter(predicate: (value: T) => unknown): Stream<T> & this;
    nonNullable(): Stream<NonNullable<T>>;
    reduce(callbackfn: (previousValue: T, currentValue: T) => T): T | undefined;
    reduce<U = T>(callbackfn: (previousValue: U, currentValue: T) => U, initialValue: U): U;
    reduceRight(callbackfn: (previousValue: T, currentValue: T) => T): T | undefined;
    reduceRight<U = T>(callbackfn: (previousValue: U, currentValue: T) => U, initialValue: U): U;
    protected recursiveReduce<U>(iterator: Iterator<T>, callbackfn: (previousValue: U | T, currentValue: T) => U, initialValue?: U): U | T | undefined;
    find<S extends T>(predicate: (value: T) => value is S): S | undefined;
    find(predicate: (value: T) => unknown): T | undefined;
    findIndex(predicate: (value: T) => unknown): number;
    includes(searchElement: T): boolean;
    flatMap<U>(callbackfn: (value: T) => U | Iterable<U>): Stream<U>;
    flat<D extends number = 1>(depth?: D): FlatStream<T, D>;
    head(): T | undefined;
    tail(skipCount?: number): Stream<T>;
    limit(maxSize: number): Stream<T>;
    distinct<Key = T>(by?: (element: T) => Key): Stream<T>;
    exclude<Key = T>(other: Iterable<T>, key?: (element: T) => Key): Stream<T>;
}
/**
 * An empty stream of any type.
 */
export declare const EMPTY_STREAM: Stream<any>;
/**
 * Use this `IteratorResult` when implementing a `StreamImpl` to indicate that there are no more elements in the stream.
 */
export declare const DONE_RESULT: IteratorReturnResult<undefined>;
/**
 * Create a stream from one or more iterables or array-likes.
 */
export declare function stream<T>(...collections: Array<Iterable<T> | ArrayLike<T>>): Stream<T>;
/**
 * A tree iterator adds the ability to prune the current iteration.
 */
export interface TreeIterator<T> extends IterableIterator<T> {
    /**
     * Skip the whole subtree below the last returned element. The iteration continues as if that
     * element had no children.
     */
    prune(): void;
}
/**
 * A tree stream is used to stream the elements of a tree, for example an AST or CST.
 */
export interface TreeStream<T> extends Stream<T> {
    iterator(): TreeIterator<T>;
}
/**
 * The default implementation of `TreeStream` takes a root element and a function that computes the
 * children of its argument. Whether the root node included in the stream is controlled with the
 * `includeRoot` option, which defaults to `false`.
 */
export declare class TreeStreamImpl<T> extends StreamImpl<{
    iterators: Array<Iterator<T>>;
    pruned: boolean;
}, T> implements TreeStream<T> {
    constructor(root: T, children: (node: T) => Iterable<T>, options?: {
        includeRoot?: boolean;
    });
    iterator(): TreeIterator<T>;
}
/**
 * A set of utility functions that reduce a stream to a single value.
 */
export declare namespace Reduction {
    /**
     * Compute the sum of a number stream.
     */
    function sum(stream: Stream<number>): number;
    /**
     * Compute the product of a number stream.
     */
    function product(stream: Stream<number>): number;
    /**
     * Compute the minimum of a number stream. Returns `undefined` if the stream is empty.
     */
    function min(stream: Stream<number>): number | undefined;
    /**
     * Compute the maximum of a number stream. Returns `undefined` if the stream is empty.
     */
    function max(stream: Stream<number>): number | undefined;
}
//# sourceMappingURL=stream.d.ts.map