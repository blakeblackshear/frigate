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
    join(separator?: string): string

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
    'done': Stream<T>,
    'recur': T extends Iterable<infer Content>
        ? FlatStream<Content, MinusOne<Depth>>
        : Stream<T>
}[Depth extends 0 ? 'done' : 'recur'];

export type MinusOne<N extends number> = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][N];

/**
 * The default implementation of `Stream` works with two input functions:
 *  - The first function creates the initial state of an iteration.
 *  - The second function gets the current state as argument and returns an `IteratorResult`.
 */
export class StreamImpl<S, T> implements Stream<T> {
    protected readonly startFn: () => S;
    protected readonly nextFn: (state: S) => IteratorResult<T>;

    constructor(startFn: () => S, nextFn: (state: S) => IteratorResult<T, undefined>) {
        this.startFn = startFn;
        this.nextFn = nextFn;
    }

    iterator(): IterableIterator<T> {
        const iterator = {
            state: this.startFn(),
            next: () => this.nextFn(iterator.state),
            [Symbol.iterator]: () => iterator
        };
        return iterator;
    }

    [Symbol.iterator](): Iterator<T> {
        return this.iterator();
    }

    isEmpty(): boolean {
        const iterator = this.iterator();
        return Boolean(iterator.next().done);
    }

    count(): number {
        const iterator = this.iterator();
        let count = 0;
        let next = iterator.next();
        while (!next.done) {
            count++;
            next = iterator.next();
        }
        return count;
    }

    toArray(): T[] {
        const result: T[] = [];
        const iterator = this.iterator();
        let next: IteratorResult<T>;
        do {
            next = iterator.next();
            if (next.value !== undefined) {
                result.push(next.value);
            }
        } while (!next.done);
        return result;
    }

    toSet(): Set<T> {
        return new Set(this);
    }

    toMap<K = T, V = T>(keyFn?: (e: T) => K, valueFn?: (e: T) => V): Map<K, V> {
        const entryStream = this.map(element => <[K, V]>[
            keyFn ? keyFn(element) : element,
            valueFn ? valueFn(element) : element
        ]);
        return new Map(entryStream);
    }

    toString(): string {
        return this.join();
    }

    concat<T2>(other: Iterable<T2>): Stream<T | T2> {
        return new StreamImpl<{ first: S, firstDone: boolean, iterator: Iterator<T2, unknown, undefined> }, T | T2>(
            () => ({ first: this.startFn(), firstDone: false, iterator: other[Symbol.iterator]() }),
            state => {
                let result: IteratorResult<T | T2>;
                if (!state.firstDone) {
                    do {
                        result = this.nextFn(state.first);
                        if (!result.done) {
                            return result;
                        }
                    } while (!result.done);
                    state.firstDone = true;
                }
                do {
                    result = state.iterator.next();
                    if (!result.done) {
                        return result;
                    }
                } while (!result.done);
                return DONE_RESULT;
            }
        );
    }

    join(separator = ','): string {
        const iterator = this.iterator();
        let value = '';
        let result: IteratorResult<T>;
        let addSeparator = false;
        do {
            result = iterator.next();
            if (!result.done) {
                if (addSeparator) {
                    value += separator;
                }
                value += toString(result.value);
            }
            addSeparator = true;
        } while (!result.done);
        return value;
    }

    indexOf(searchElement: T, fromIndex = 0): number {
        const iterator = this.iterator();
        let index = 0;
        let next = iterator.next();
        while (!next.done) {
            if (index >= fromIndex && next.value === searchElement) {
                return index;
            }
            next = iterator.next();
            index++;
        }
        return -1;
    }

    // In the following definition the '& this' part in the return type is important
    // _and_ the order within 'Stream<U> & this' is crucial!
    // Otherwise Typescript would infer the type of 'this' as 'StreamImpl<S, T> & Stream<U>'
    // (or '<subClass of StreamImpl<S, T> & Stream<U>') and usages like
    // ```
    //  const stream = new StreamImpl(...);
    //  ... stream.every(<typeGuard>) & stream....
    // ```
    // cannot benefit from '<typeGuard>', as Typescript would priorize the signatures
    // of 'StreamImpl<S, T>' (i.e. those of 'Stream<T>') over those of 'Stream<U>'.
    // With the order of 'Stream<U> & this' the signatures of 'Stream<U>' get precedence.
    every<U extends T>(predicate: (value: T) => value is U): this is Stream<U> & this;
    every(predicate: (value: T) => unknown): boolean;
    every(predicate: (value: T) => unknown): boolean {
        const iterator = this.iterator();
        let next = iterator.next();
        while (!next.done) {
            if (!predicate(next.value)) {
                return false;
            }
            next = iterator.next();
        }
        return true;
    }

    some(predicate: (value: T) => unknown): boolean {
        const iterator = this.iterator();
        let next = iterator.next();
        while (!next.done) {
            if (predicate(next.value)) {
                return true;
            }
            next = iterator.next();
        }
        return false;
    }

    forEach(callbackfn: (value: T, index: number) => void): void {
        const iterator = this.iterator();
        let index = 0;
        let next = iterator.next();
        while (!next.done) {
            callbackfn(next.value, index);
            next = iterator.next();
            index++;
        }
    }

    map<U>(callbackfn: (value: T) => U): Stream<U> {
        return new StreamImpl<S, U>(
            this.startFn,
            (state) => {
                const { done, value } = this.nextFn(state);
                if (done) {
                    return DONE_RESULT;
                } else {
                    return { done: false, value: callbackfn(value) };
                }
            }
        );
    }

    // for remarks on the return type definition refer to 'every<U extends T>(...)'
    filter<U extends T>(predicate: (value: T) => value is U): Stream<U> & this;
    filter(predicate: (value: T) => unknown): Stream<T> & this;
    filter(predicate: (value: T) => unknown): Stream<T> {
        return new StreamImpl<S, T>(
            this.startFn,
            state => {
                let result: IteratorResult<T>;
                do {
                    result = this.nextFn(state);
                    if (!result.done && predicate(result.value)) {
                        return result;
                    }
                } while (!result.done);
                return DONE_RESULT;
            }
        );
    }

    nonNullable(): Stream<NonNullable<T>> {
        return this.filter(e => e !== undefined && e !== null) as Stream<NonNullable<T>>;
    }

    reduce(callbackfn: (previousValue: T, currentValue: T) => T): T | undefined;
    reduce<U = T>(callbackfn: (previousValue: U, currentValue: T) => U, initialValue: U): U;
    reduce<U>(callbackfn: (previousValue: U | T, currentValue: T) => U, initialValue?: U): U | T | undefined {
        const iterator = this.iterator();
        let previousValue: U | T | undefined = initialValue;
        let next = iterator.next();
        while (!next.done) {
            if (previousValue === undefined) {
                previousValue = next.value;
            } else {
                previousValue = callbackfn(previousValue, next.value);
            }
            next = iterator.next();
        }
        return previousValue;
    }

    reduceRight(callbackfn: (previousValue: T, currentValue: T) => T): T | undefined;
    reduceRight<U = T>(callbackfn: (previousValue: U, currentValue: T) => U, initialValue: U): U;
    reduceRight<U>(callbackfn: (previousValue: U | T, currentValue: T) => U, initialValue?: U): U | T | undefined {
        return this.recursiveReduce(this.iterator(), callbackfn, initialValue);
    }

    protected recursiveReduce<U>(iterator: Iterator<T>, callbackfn: (previousValue: U | T, currentValue: T) => U, initialValue?: U): U | T | undefined {
        const next = iterator.next();
        if (next.done) {
            return initialValue;
        }
        const previousValue = this.recursiveReduce(iterator, callbackfn, initialValue);
        if (previousValue === undefined) {
            return next.value;
        }
        return callbackfn(previousValue, next.value);
    }

    find<S extends T>(predicate: (value: T) => value is S): S | undefined;
    find(predicate: (value: T) => unknown): T | undefined;
    find(predicate: (value: T) => unknown): T | undefined {
        const iterator = this.iterator();
        let next = iterator.next();
        while (!next.done) {
            if (predicate(next.value)) {
                return next.value;
            }
            next = iterator.next();
        }
        return undefined;
    }

    findIndex(predicate: (value: T) => unknown): number {
        const iterator = this.iterator();
        let index = 0;
        let next = iterator.next();
        while (!next.done) {
            if (predicate(next.value)) {
                return index;
            }
            next = iterator.next();
            index++;
        }
        return -1;
    }

    includes(searchElement: T): boolean {
        const iterator = this.iterator();
        let next = iterator.next();
        while (!next.done) {
            if (next.value === searchElement) {
                return true;
            }
            next = iterator.next();
        }
        return false;
    }

    flatMap<U>(callbackfn: (value: T) => U | Iterable<U>): Stream<U> {
        type FlatMapState = { this: S, iterator?: Iterator<U, undefined> }
        return new StreamImpl<FlatMapState, U>(
            () => ({ this: this.startFn() }),
            (state) => {
                do {
                    if (state.iterator) {
                        const next = state.iterator.next();
                        if (next.done) {
                            state.iterator = undefined;
                        } else {
                            return next;
                        }
                    }
                    const { done, value } = this.nextFn(state.this);
                    if (!done) {
                        const mapped = callbackfn(value);
                        if (isIterable(mapped)) {
                            state.iterator = mapped[Symbol.iterator]();
                        } else {
                            return { done: false, value: mapped };
                        }
                    }
                } while (state.iterator);
                return DONE_RESULT;
            }
        );
    }

    flat<D extends number = 1>(depth?: D): FlatStream<T, D> {
        if (depth === undefined) {
            depth = 1 as D;
        }
        if (depth <= 0) {
            return this as unknown as FlatStream<T, D>;
        }
        const stream = depth > 1 ? this.flat(depth - 1) as unknown as StreamImpl<S, T> : this;
        type FlatMapState = { this: S, iterator?: Iterator<T, undefined> }
        return new StreamImpl<FlatMapState, T>(
            () => ({ this: stream.startFn() }),
            (state) => {
                do {
                    if (state.iterator) {
                        const next = state.iterator.next();
                        if (next.done) {
                            state.iterator = undefined;
                        } else {
                            return next;
                        }
                    }
                    const { done, value } = stream.nextFn(state.this);
                    if (!done) {
                        if (isIterable(value)) {
                            state.iterator = value[Symbol.iterator]() as Iterator<T>;
                        } else {
                            return { done: false, value: value };
                        }
                    }
                } while (state.iterator);
                return DONE_RESULT;
            }
        ) as unknown as FlatStream<T, D>;
    }

    head(): T | undefined {
        const iterator = this.iterator();
        const result = iterator.next();
        if (result.done) {
            return undefined;
        }
        return result.value;
    }

    tail(skipCount = 1): Stream<T> {
        return new StreamImpl<S, T>(
            () => {
                const state = this.startFn();
                for (let i = 0; i < skipCount; i++) {
                    const next = this.nextFn(state);
                    if (next.done) {
                        return state;
                    }
                }
                return state;
            },
            this.nextFn
        );
    }

    limit(maxSize: number): Stream<T> {
        return new StreamImpl<{ size: number, state: S }, T>(
            () => ({ size: 0, state: this.startFn() }),
            state => {
                state.size++;
                if (state.size > maxSize) {
                    return DONE_RESULT;
                }
                return this.nextFn(state.state);
            }
        );
    }

    distinct<Key = T>(by?: (element: T) => Key): Stream<T> {
        return new StreamImpl<{ set: Set<Key | T>, internalState: S }, T>(
            () => ({ set: new Set<Key | T>(), internalState: this.startFn() }),
            state => {
                let result: IteratorResult<T>;
                do {
                    result = this.nextFn(state.internalState);
                    if (!result.done) {
                        const value = by ? by(result.value) : result.value;
                        if (!state.set.has(value)) {
                            state.set.add(value);
                            return result;
                        }
                    }
                } while (!result.done);
                return DONE_RESULT;
            }
        );
    }

    exclude<Key = T>(other: Iterable<T>, key?: (element: T) => Key): Stream<T> {
        const otherKeySet = new Set<Key | T>();
        for (const item of other) {
            const value = key ? key(item) : item;
            otherKeySet.add(value);
        }
        return this.filter(e => {
            const ownKey = key ? key(e) : e;
            return !otherKeySet.has(ownKey);
        });
    }
}

function toString(item: unknown): string {
    if (typeof item === 'string') {
        return item as string;
    }
    if (typeof item === 'undefined') {
        return 'undefined';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (item as any).toString === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (item as any).toString();
    }
    return Object.prototype.toString.call(item);
}

function isIterable<T>(obj: unknown): obj is Iterable<T> {
    return !!obj && typeof (obj as Iterable<T>)[Symbol.iterator] === 'function';
}

/**
 * An empty stream of any type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EMPTY_STREAM: Stream<any> = new StreamImpl<undefined, any>(() => undefined, () => DONE_RESULT);

/**
 * Use this `IteratorResult` when implementing a `StreamImpl` to indicate that there are no more elements in the stream.
 */
export const DONE_RESULT: IteratorReturnResult<undefined> = Object.freeze({ done: true, value: undefined });

/**
 * Create a stream from one or more iterables or array-likes.
 */
export function stream<T>(...collections: Array<Iterable<T> | ArrayLike<T>>): Stream<T> {
    if (collections.length === 1) {
        const collection = collections[0];
        if (collection instanceof StreamImpl) {
            return collection as Stream<T>;
        }
        if (isIterable(collection)) {
            return new StreamImpl<Iterator<T, undefined>, T>(
                () => collection[Symbol.iterator](),
                (iterator) => iterator.next()
            );
        }
        if (typeof collection.length === 'number') {
            return new StreamImpl<{ index: number }, T>(
                () => ({ index: 0 }),
                (state) => {
                    if (state.index < collection.length) {
                        return { done: false, value: collection[state.index++] };
                    } else {
                        return DONE_RESULT;
                    }
                }
            );
        }
    }
    if (collections.length > 1) {
        type State = { collIndex: number, iterator?: Iterator<T, undefined>, array?: ArrayLike<T>, arrIndex: number };
        return new StreamImpl<State, T>(
            () => ({ collIndex: 0, arrIndex: 0 }),
            (state) => {
                do {
                    if (state.iterator) {
                        const next = state.iterator.next();
                        if (!next.done) {
                            return next;
                        }
                        state.iterator = undefined;
                    }
                    if (state.array) {
                        if (state.arrIndex < state.array.length) {
                            return { done: false, value: state.array[state.arrIndex++] };
                        }
                        state.array = undefined;
                        state.arrIndex = 0;
                    }
                    if (state.collIndex < collections.length) {
                        const collection = collections[state.collIndex++];
                        if (isIterable(collection)) {
                            state.iterator = collection[Symbol.iterator]();
                        } else if (collection && typeof collection.length === 'number') {
                            state.array = collection;
                        }
                    }
                } while (state.iterator || state.array || state.collIndex < collections.length);
                return DONE_RESULT;
            }
        );
    }
    return EMPTY_STREAM;
}

/**
 * A tree iterator adds the ability to prune the current iteration.
 */
export interface TreeIterator<T> extends IterableIterator<T> {
    /**
     * Skip the whole subtree below the last returned element. The iteration continues as if that
     * element had no children.
     */
    prune(): void
}

/**
 * A tree stream is used to stream the elements of a tree, for example an AST or CST.
 */
export interface TreeStream<T> extends Stream<T> {
    iterator(): TreeIterator<T>
}

/**
 * The default implementation of `TreeStream` takes a root element and a function that computes the
 * children of its argument. Whether the root node included in the stream is controlled with the
 * `includeRoot` option, which defaults to `false`.
 */
export class TreeStreamImpl<T>
    extends StreamImpl<{ iterators: Array<Iterator<T>>, pruned: boolean }, T>
    implements TreeStream<T> {

    constructor(root: T, children: (node: T) => Iterable<T>, options?: { includeRoot?: boolean }) {
        super(
            () => ({
                iterators: options?.includeRoot ? [[root][Symbol.iterator]()] : [children(root)[Symbol.iterator]()],
                pruned: false
            }),
            state => {
                if (state.pruned) {
                    state.iterators.pop();
                    state.pruned = false;
                }
                while (state.iterators.length > 0) {
                    const iterator = state.iterators[state.iterators.length - 1];
                    const next = iterator.next();
                    if (next.done) {
                        state.iterators.pop();
                    } else {
                        state.iterators.push(children(next.value)[Symbol.iterator]());
                        return next;
                    }
                }
                return DONE_RESULT;
            }
        );
    }

    override iterator(): TreeIterator<T> {
        const iterator = {
            state: this.startFn(),
            next: () => this.nextFn(iterator.state),
            prune: () => {
                iterator.state.pruned = true;
            },
            [Symbol.iterator]: () => iterator
        };
        return iterator;
    }
}

/**
 * A set of utility functions that reduce a stream to a single value.
 */
export namespace Reduction {

    /**
     * Compute the sum of a number stream.
     */
    export function sum(stream: Stream<number>): number {
        return stream.reduce((a, b) => a + b, 0);
    }

    /**
     * Compute the product of a number stream.
     */
    export function product(stream: Stream<number>): number {
        return stream.reduce((a, b) => a * b, 0);
    }

    /**
     * Compute the minimum of a number stream. Returns `undefined` if the stream is empty.
     */
    export function min(stream: Stream<number>): number | undefined {
        return stream.reduce((a, b) => Math.min(a, b));
    }

    /**
     * Compute the maximum of a number stream. Returns `undefined` if the stream is empty.
     */
    export function max(stream: Stream<number>): number | undefined {
        return stream.reduce((a, b) => Math.max(a, b));
    }

}
