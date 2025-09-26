/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
/**
 * The default implementation of `Stream` works with two input functions:
 *  - The first function creates the initial state of an iteration.
 *  - The second function gets the current state as argument and returns an `IteratorResult`.
 */
export class StreamImpl {
    constructor(startFn, nextFn) {
        this.startFn = startFn;
        this.nextFn = nextFn;
    }
    iterator() {
        const iterator = {
            state: this.startFn(),
            next: () => this.nextFn(iterator.state),
            [Symbol.iterator]: () => iterator
        };
        return iterator;
    }
    [Symbol.iterator]() {
        return this.iterator();
    }
    isEmpty() {
        const iterator = this.iterator();
        return Boolean(iterator.next().done);
    }
    count() {
        const iterator = this.iterator();
        let count = 0;
        let next = iterator.next();
        while (!next.done) {
            count++;
            next = iterator.next();
        }
        return count;
    }
    toArray() {
        const result = [];
        const iterator = this.iterator();
        let next;
        do {
            next = iterator.next();
            if (next.value !== undefined) {
                result.push(next.value);
            }
        } while (!next.done);
        return result;
    }
    toSet() {
        return new Set(this);
    }
    toMap(keyFn, valueFn) {
        const entryStream = this.map(element => [
            keyFn ? keyFn(element) : element,
            valueFn ? valueFn(element) : element
        ]);
        return new Map(entryStream);
    }
    toString() {
        return this.join();
    }
    concat(other) {
        return new StreamImpl(() => ({ first: this.startFn(), firstDone: false, iterator: other[Symbol.iterator]() }), state => {
            let result;
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
        });
    }
    join(separator = ',') {
        const iterator = this.iterator();
        let value = '';
        let result;
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
    indexOf(searchElement, fromIndex = 0) {
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
    every(predicate) {
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
    some(predicate) {
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
    forEach(callbackfn) {
        const iterator = this.iterator();
        let index = 0;
        let next = iterator.next();
        while (!next.done) {
            callbackfn(next.value, index);
            next = iterator.next();
            index++;
        }
    }
    map(callbackfn) {
        return new StreamImpl(this.startFn, (state) => {
            const { done, value } = this.nextFn(state);
            if (done) {
                return DONE_RESULT;
            }
            else {
                return { done: false, value: callbackfn(value) };
            }
        });
    }
    filter(predicate) {
        return new StreamImpl(this.startFn, state => {
            let result;
            do {
                result = this.nextFn(state);
                if (!result.done && predicate(result.value)) {
                    return result;
                }
            } while (!result.done);
            return DONE_RESULT;
        });
    }
    nonNullable() {
        return this.filter(e => e !== undefined && e !== null);
    }
    reduce(callbackfn, initialValue) {
        const iterator = this.iterator();
        let previousValue = initialValue;
        let next = iterator.next();
        while (!next.done) {
            if (previousValue === undefined) {
                previousValue = next.value;
            }
            else {
                previousValue = callbackfn(previousValue, next.value);
            }
            next = iterator.next();
        }
        return previousValue;
    }
    reduceRight(callbackfn, initialValue) {
        return this.recursiveReduce(this.iterator(), callbackfn, initialValue);
    }
    recursiveReduce(iterator, callbackfn, initialValue) {
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
    find(predicate) {
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
    findIndex(predicate) {
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
    includes(searchElement) {
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
    flatMap(callbackfn) {
        return new StreamImpl(() => ({ this: this.startFn() }), (state) => {
            do {
                if (state.iterator) {
                    const next = state.iterator.next();
                    if (next.done) {
                        state.iterator = undefined;
                    }
                    else {
                        return next;
                    }
                }
                const { done, value } = this.nextFn(state.this);
                if (!done) {
                    const mapped = callbackfn(value);
                    if (isIterable(mapped)) {
                        state.iterator = mapped[Symbol.iterator]();
                    }
                    else {
                        return { done: false, value: mapped };
                    }
                }
            } while (state.iterator);
            return DONE_RESULT;
        });
    }
    flat(depth) {
        if (depth === undefined) {
            depth = 1;
        }
        if (depth <= 0) {
            return this;
        }
        const stream = depth > 1 ? this.flat(depth - 1) : this;
        return new StreamImpl(() => ({ this: stream.startFn() }), (state) => {
            do {
                if (state.iterator) {
                    const next = state.iterator.next();
                    if (next.done) {
                        state.iterator = undefined;
                    }
                    else {
                        return next;
                    }
                }
                const { done, value } = stream.nextFn(state.this);
                if (!done) {
                    if (isIterable(value)) {
                        state.iterator = value[Symbol.iterator]();
                    }
                    else {
                        return { done: false, value: value };
                    }
                }
            } while (state.iterator);
            return DONE_RESULT;
        });
    }
    head() {
        const iterator = this.iterator();
        const result = iterator.next();
        if (result.done) {
            return undefined;
        }
        return result.value;
    }
    tail(skipCount = 1) {
        return new StreamImpl(() => {
            const state = this.startFn();
            for (let i = 0; i < skipCount; i++) {
                const next = this.nextFn(state);
                if (next.done) {
                    return state;
                }
            }
            return state;
        }, this.nextFn);
    }
    limit(maxSize) {
        return new StreamImpl(() => ({ size: 0, state: this.startFn() }), state => {
            state.size++;
            if (state.size > maxSize) {
                return DONE_RESULT;
            }
            return this.nextFn(state.state);
        });
    }
    distinct(by) {
        return new StreamImpl(() => ({ set: new Set(), internalState: this.startFn() }), state => {
            let result;
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
        });
    }
    exclude(other, key) {
        const otherKeySet = new Set();
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
function toString(item) {
    if (typeof item === 'string') {
        return item;
    }
    if (typeof item === 'undefined') {
        return 'undefined';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof item.toString === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return item.toString();
    }
    return Object.prototype.toString.call(item);
}
function isIterable(obj) {
    return !!obj && typeof obj[Symbol.iterator] === 'function';
}
/**
 * An empty stream of any type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EMPTY_STREAM = new StreamImpl(() => undefined, () => DONE_RESULT);
/**
 * Use this `IteratorResult` when implementing a `StreamImpl` to indicate that there are no more elements in the stream.
 */
export const DONE_RESULT = Object.freeze({ done: true, value: undefined });
/**
 * Create a stream from one or more iterables or array-likes.
 */
export function stream(...collections) {
    if (collections.length === 1) {
        const collection = collections[0];
        if (collection instanceof StreamImpl) {
            return collection;
        }
        if (isIterable(collection)) {
            return new StreamImpl(() => collection[Symbol.iterator](), (iterator) => iterator.next());
        }
        if (typeof collection.length === 'number') {
            return new StreamImpl(() => ({ index: 0 }), (state) => {
                if (state.index < collection.length) {
                    return { done: false, value: collection[state.index++] };
                }
                else {
                    return DONE_RESULT;
                }
            });
        }
    }
    if (collections.length > 1) {
        return new StreamImpl(() => ({ collIndex: 0, arrIndex: 0 }), (state) => {
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
                    }
                    else if (collection && typeof collection.length === 'number') {
                        state.array = collection;
                    }
                }
            } while (state.iterator || state.array || state.collIndex < collections.length);
            return DONE_RESULT;
        });
    }
    return EMPTY_STREAM;
}
/**
 * The default implementation of `TreeStream` takes a root element and a function that computes the
 * children of its argument. Whether the root node included in the stream is controlled with the
 * `includeRoot` option, which defaults to `false`.
 */
export class TreeStreamImpl extends StreamImpl {
    constructor(root, children, options) {
        super(() => ({
            iterators: (options === null || options === void 0 ? void 0 : options.includeRoot) ? [[root][Symbol.iterator]()] : [children(root)[Symbol.iterator]()],
            pruned: false
        }), state => {
            if (state.pruned) {
                state.iterators.pop();
                state.pruned = false;
            }
            while (state.iterators.length > 0) {
                const iterator = state.iterators[state.iterators.length - 1];
                const next = iterator.next();
                if (next.done) {
                    state.iterators.pop();
                }
                else {
                    state.iterators.push(children(next.value)[Symbol.iterator]());
                    return next;
                }
            }
            return DONE_RESULT;
        });
    }
    iterator() {
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
export var Reduction;
(function (Reduction) {
    /**
     * Compute the sum of a number stream.
     */
    function sum(stream) {
        return stream.reduce((a, b) => a + b, 0);
    }
    Reduction.sum = sum;
    /**
     * Compute the product of a number stream.
     */
    function product(stream) {
        return stream.reduce((a, b) => a * b, 0);
    }
    Reduction.product = product;
    /**
     * Compute the minimum of a number stream. Returns `undefined` if the stream is empty.
     */
    function min(stream) {
        return stream.reduce((a, b) => Math.min(a, b));
    }
    Reduction.min = min;
    /**
     * Compute the maximum of a number stream. Returns `undefined` if the stream is empty.
     */
    function max(stream) {
        return stream.reduce((a, b) => Math.max(a, b));
    }
    Reduction.max = max;
})(Reduction || (Reduction = {}));
//# sourceMappingURL=stream.js.map