/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { AstNode, Properties } from '../syntax-tree.js';
import { type Generated, isGeneratorNode } from './generator-node.js';
import type { SourceRegion } from './generator-tracing.js';
import { CompositeGeneratorNode, traceToNode } from './generator-node.js';

export interface JoinOptions<T> {
    filter?: (element: T, index: number, isLast: boolean) => boolean;
    prefix?: Generated | ((element: T, index: number, isLast: boolean) => Generated | undefined);
    suffix?: Generated | ((element: T, index: number, isLast: boolean) => Generated | undefined);
    separator?: Generated;
    appendNewLineIfNotEmpty?: true;
    skipNewLineAfterLastItem?: true;
}

const defaultToGenerated = (e: unknown): Generated => e === undefined || typeof e === 'string' || isGeneratorNode(e) ? e : String(e);

/**
 * Joins the elements of the given `iterable` of pre-computed instances of {@link Generated}
 * by appending the results to a {@link CompositeGeneratorNode} being returned finally.
 * Each individual element is tested to be a string, a {@link CompositeGeneratorNode},
 * or `undefined` and included as is if that test is satisfied. Otherwise the result of
 * applying {@link String} (string constructor) to the element is included.
 *
 * Note: empty strings being included in `iterable` are treated as ordinary string
 * representations, while the value of `undefined` makes this function to ignore the
 * corresponding item and no separator is appended, if configured.
 *
 * Examples:
 * ```
 *   exandToNode`
 *       ${ joinToNode(['a', 'b'], { appendNewLineIfNotEmpty: true }) }
 *
 *       ${ joinToNode(new Set(['a', undefined, getElementNode()]), { separator: ',', appendNewLineIfNotEmpty: true }) }
 *   `
 * ```
 *
 * @param iterable an {@link Array} or {@link Iterable} providing the elements to be joined
 *
 * @param options optional config object for defining a `separator`, contributing specialized
 *  `prefix` and/or `suffix` providers, and activating conditional line-break insertion. In addition,
 *  a dedicated `filter` function can be provided that is required get provided with the original
 *  element indices in the aformentioned functions, if the list is to be filtered. If
 *  {@link Array.filter} would be applied to the original list, the indices will be those of the
 *  filtered list during subsequent processing that in particular will cause confusion when using
 *  the tracing variant of this function named ({@link joinTracedToNode}).
 * @returns the resulting {@link CompositeGeneratorNode} representing `iterable`'s content
 */
export function joinToNode<Generated>(
    iterable: Iterable<Generated> | Generated[],
    options?: JoinOptions<Generated>
): CompositeGeneratorNode | undefined;

/**
 * Joins the elements of the given `iterable` by applying `toGenerated` to each element
 * and appending the results to a {@link CompositeGeneratorNode} being returned finally.
 *
 * Note: empty strings being returned by `toGenerated` are treated as ordinary string
 * representations, while the result of `undefined` makes this function to ignore the
 * corresponding item and no separator is appended, if configured.
 *
 * Examples:
 * ```
 *   exandToNode`
 *       ${ joinToNode(['a', 'b'], String, { appendNewLineIfNotEmpty: true }) }
 *
 *       ${ joinToNode(new Set(['a', undefined, 'b']), e => e && String(e), { separator: ',', appendNewLineIfNotEmpty: true }) }
 *   `
 * ```
 *
 * @param iterable an {@link Array} or {@link Iterable} providing the elements to be joined
 *
 * @param toGenerated a callback converting each individual element to a string, a
 *  {@link CompositeGeneratorNode}, or to `undefined` if to be omitted, defaults to the `identity`
 *  for strings, generator nodes, and `undefined`, and to {@link String} otherwise.
 *
 * @param options optional config object for defining a `separator`, contributing specialized
 *  `prefix` and/or `suffix` providers, and activating conditional line-break insertion. In addition,
 *  a dedicated `filter` function can be provided that is required get provided with the original
 *  element indices in the aformentioned functions, if the list is to be filtered. If
 *  {@link Array.filter} would be applied to the original list, the indices will be those of the
 *  filtered list during subsequent processing that in particular will cause confusion when using
 *  the tracing variant of this function named ({@link joinTracedToNode}).
 * @returns the resulting {@link CompositeGeneratorNode} representing `iterable`'s content
 */
export function joinToNode<T>(
    iterable: Iterable<T> | T[],
    toGenerated?: ((element: T, index: number, isLast: boolean) => Generated),
    options?: JoinOptions<T>
): CompositeGeneratorNode | undefined;

export function joinToNode<T>(
    iterable: Iterable<T> | T[],
    toGeneratedOrOptions: ((element: T, index: number, isLast: boolean) => Generated) | JoinOptions<T> = defaultToGenerated,
    options: JoinOptions<T> = {}
): CompositeGeneratorNode | undefined {

    const toGenerated = typeof toGeneratedOrOptions === 'function' ? toGeneratedOrOptions : defaultToGenerated;
    const { filter, prefix, suffix, separator, appendNewLineIfNotEmpty, skipNewLineAfterLastItem } = typeof toGeneratedOrOptions === 'object' ? toGeneratedOrOptions : options;

    const prefixFunc = typeof prefix === 'function' ? prefix : (() => prefix);
    const suffixFunc = typeof suffix === 'function' ? suffix : (() => suffix);

    return reduceWithIsLast(iterable, (node, it, i, isLast) => {
        if (filter && !filter(it, i, isLast)) {
            return node;
        }
        const content = toGenerated(it, i, isLast);
        return content === undefined ? /* in this case don't append anything to */ node : /* otherwise: */ (node ??= new CompositeGeneratorNode())
            .append(prefixFunc(it, i, isLast))
            .append(content)
            .append(suffixFunc(it, i, isLast))
            .appendIf(!isLast, separator)
            .appendNewLineIfNotEmptyIf(
                // append 'newLineIfNotEmpty' elements only if 'node' has some content already,
                //  as if the parent is an IndentNode with 'indentImmediately' set to 'false'
                //  the indentation is not properly applied to the first non-empty line of the (this) child node
                // besides, append the newLine only if more lines are following, if appending a newline
                //  is not suppressed for the final item
                !node.isEmpty() && !!appendNewLineIfNotEmpty && (!isLast || !skipNewLineAfterLastItem)
            );
    });
}

/**
 * Convenience function for joining the elements of some `iterable` and gathering tracing information.
 *
 * This function returns another function that does the processing, and that expects same list of
 *  arguments as expected by {@link joinToNode}, i.e. an `iterable`, a function `toGenerated`
 *  converting each element into a `Generated`, as well as some `options`.
 *
 * That function then joins the elements of `iterable` by delegating to {@link joinToNode}.
 * Via {@link traceToNode} the resulting generator node is supplemented with the provided tracing
 *  information in form of `{astNode, property?, index?}`, and finally returned. In addition,
 *  if `property` is given each element's generator node representation is augmented with the
 *  provided tracing information plus the index of the element within `iterable`.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandToNode`
 *       children: ${ joinTracedToNode(entity, 'children')(entity.children, child => child.name, { separator: ' ' }) };
 *   `.appendNewLine()
 */
export function joinTracedToNode<T extends AstNode>(astNode: T, property?: Properties<T>): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode;

/**
 * Convenience function for joining the elements of some `iterable` and gathering tracing information
 *  in form of concrete coordinates.
 *
 * This function returns another function that does the processing, and that expects same list of
 *  arguments as expected by {@link joinToNode}, i.e. an `iterable`, a function `toGenerated`
 *  converting each element into a `Generated`, as well as some `options`.
 *
 * That function then joins the elements of `iterable` by delegating to {@link joinToNode}.
 * Via {@link traceToNode} the resulting generator node is supplemented with the provided tracing
 *  information, and finally returned. Elementwise tracing need to be implemented by client code
 *  within `toGenerated`, if required.
 *
 * @param sourceRegion a text region within some file in form of concrete coordinates,
 *  if `undefined` no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandToNode`
 *       children: ${ joinTracedToNode(findNodesForProperty(entity.$cstNode, 'children'))(entity.children, child => child.name, { separator: ' ' }) };
 *   `.appendNewLine()
 */
export function joinTracedToNode(sourceRegion: SourceRegion | undefined): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode;

/**
 * Convenience function for joining the elements of some `iterable` and gathering tracing information
 *  in form of a list of concrete coordinates.
 *
 * This function returns another function that does the processing, and that expects same list of
 *  arguments as expected by {@link joinToNode}, i.e. an `iterable`, a function `toGenerated`
 *  converting each element into a `Generated`, as well as some `options`.
 *
 * That function then joins the elements of `iterable` by delegating to {@link joinToNode}.
 * Via {@link traceToNode} the resulting generator node is supplemented with the provided tracing
 *  information, and finally returned. Elementwise tracing need to be implemented by client code
 *  within `toGenerated`, if required.
 *
 * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
 *  of all the contained source regions.
 *
 * @param sourceRegions a list of text regions within some file in form of concrete coordinates,
 *  if empty no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandToNode`
 *       children: ${ joinTracedToNode(findNodesForProperty(entity.$cstNode, 'children'))(entity.children, child => child.name, { separator: ' ' }) };
 *   `.appendNewLine()
 */
export function joinTracedToNode(sourceRegions: SourceRegion[]): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode;

// implementation:
export function joinTracedToNode<T extends AstNode>(source: T | undefined | SourceRegion | SourceRegion[], property?: Properties<T>): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode {
    return (iterable, toGeneratedOrOptions, options) => {
        options ??= typeof toGeneratedOrOptions === 'object' ? toGeneratedOrOptions : undefined;
        const toGenerated = typeof toGeneratedOrOptions === 'function' ? toGeneratedOrOptions : defaultToGenerated;
        return traceToNode(source as T, property)(
            joinToNode(
                iterable,
                source && property ? (element, index, isLast) => traceToNode(source as T, property, index)(toGenerated(element, index, isLast)) : toGenerated,
                options
            )
        );
    };
}

/**
 * Convenience function for joining the elements of some `iterable` and gathering tracing information,
 *  if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this function returns another function that does the processing,
 *  and that expects same list of arguments as expected by {@link joinToNode}, i.e. an `iterable`,
 *  a function `toGenerated` converting each element into a `Generated`, as well as some `options`.
 *
 * That function then joins the elements of `iterable` by delegating to {@link joinToNode}.
 * Via {@link traceToNode} the resulting generator node is supplemented with the provided tracing
 *  information, and finally returned. In addition, if `property` is given each element's
 *  generator node representation is augmented with the provided tracing information
 *  plus the index of the element within `iterable`.
 *
 * Otherwise, if `condition` is equal to false, the returned function just returns `undefined`.
 *
 * @param condition a boolean value indicating whether to evaluate the provided iterable.
 *
 * @param astNode the AstNode corresponding to the appended content
 *
 * @param property the value property name (string) corresponding to the appended content,
 *  if e.g. the content corresponds to some `string` or `number` property of `astNode`, is optional
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode} or `undefined`.
 *
 * @example
 *   expandToNode`
 *       children: ${ joinTracedToNode(entity, 'children')(entity.children, child => child.name, { separator: ' ' }) };
 *   `.appendNewLine()
 */
export function joinTracedToNodeIf<T extends AstNode>(condition: boolean, astNode: T, property?: Properties<T>): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for joining the elements of some `iterable` and gathering tracing information
 *  in form of a list of concrete coordinates, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this function returns another function that does the processing,
 *  and that expects same list of arguments as expected by {@link joinToNode}, i.e. an `iterable`,
 *  a function `toGenerated` converting each element into a `Generated`, as well as some `options`.
 *
 * That function then joins the elements of `iterable` by delegating to {@link joinToNode}.
 * Via {@link traceToNode} the resulting generator node is supplemented with the provided tracing
 *  information, and finally returned. Element-wise tracing need to be implemented by client code
 *  within `toGenerated`, if required.
 *
 * Otherwise, if `condition` is equal to false, the returned function just returns `undefined`.
 *
 * If `sourceRegion` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
 *
 * @param condition a boolean value indicating whether to evaluate the provided iterable.
 *
 * @param sourceRegion a text region within some file in form of concrete coordinates or a supplier function,
 *  if `undefined` no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandToNode`
 *       children: ${ joinTracedToNodeIf(entity !== undefined, () => entity.$cstNode)(entity.children, child => child.name, { separator: ' ' }) };
 *   `.appendNewLine()
 */
export function joinTracedToNodeIf(condition: boolean, sourceRegion: SourceRegion | undefined | (() => SourceRegion | undefined)): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode | undefined;

/**
 * Convenience function for joining the elements of some `iterable` and gathering tracing information
 *  in form of a list of concrete coordinates, if `condition` is equal to `true`.
 *
 * If `condition` is satisfied, this function returns another function that does the processing,
 *  and that expects same list of arguments as expected by {@link joinToNode}, i.e. an `iterable`,
 *  a function `toGenerated` converting each element into a `Generated`, as well as some `options`.
 *
 * That function then joins the elements of `iterable` by delegating to {@link joinToNode}.
 * Via {@link traceToNode} the resulting generator node is supplemented with the provided tracing
 *  information, and finally returned. Element-wise tracing need to be implemented by client code
 *  within `toGenerated`, if required.
 *
 * Otherwise, if `condition` is equal to false, the returned function just returns `undefined`.
 *
 * The list of regions in `sourceRegions` will later be reduced to the smallest encompassing region
 *  of all the contained source regions.
 * If `sourceRegions` is a function supplying the corresponding regions, it's only called if `condition` is satisfied.
 *
 * @param condition a boolean value indicating whether to evaluate the provided iterable.
 *
 * @param sourceRegions a list of text regions within some file in form of concrete coordinates or a supplier function,
 *  if empty no tracing will happen
 *
 * @returns a function behaving as described above, which in turn returns a {@link CompositeGeneratorNode}.
 *
 * @example
 *   expandToNode`
 *       children: ${ joinTracedToNodeIf(entity !== undefined, () => findNodesForProperty(entity.$cstNode, 'children'))(entity.children, child => child.name, { separator: ' ' }) };
 *   `.appendNewLine()
 */
export function joinTracedToNodeIf(condition: boolean, sourceRegions: SourceRegion[] | (() => SourceRegion[])): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode | undefined;

// implementation:
export function joinTracedToNodeIf<T extends AstNode>(condition: boolean, source: T | undefined | SourceRegion | SourceRegion[] | (() => undefined | SourceRegion | SourceRegion[]), property?: Properties<T>): // eslint-disable-next-line @typescript-eslint/indent
    <E>(iterable: Iterable<E> | E[], toGenerated?: ((element: E, index: number, isLast: boolean) => Generated) | JoinOptions<E>, options?: JoinOptions<E>) => CompositeGeneratorNode | undefined {
    return condition ? joinTracedToNode((typeof source === 'function' ? source() : source) as T, property) : () => undefined;
}

function reduceWithIsLast<T, R>(
    iterable: Iterable<T> | T[],
    callbackfn: (previous: R | undefined, current: T, currentIndex: number, isLast: boolean) => R | undefined,
    initial?: R
) {
    const iterator = iterable[Symbol.iterator]();
    let next = iterator.next();
    let index = 0;
    let result = initial;

    while (!next.done) {
        const nextNext = iterator.next();
        result = callbackfn(result, next.value, index, Boolean(nextNext.done));
        next = nextNext;
        index++;
    }

    return result;
}
