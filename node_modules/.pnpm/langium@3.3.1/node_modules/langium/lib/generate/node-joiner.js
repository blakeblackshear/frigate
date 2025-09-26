/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isGeneratorNode } from './generator-node.js';
import { CompositeGeneratorNode, traceToNode } from './generator-node.js';
const defaultToGenerated = (e) => e === undefined || typeof e === 'string' || isGeneratorNode(e) ? e : String(e);
export function joinToNode(iterable, toGeneratedOrOptions = defaultToGenerated, options = {}) {
    const toGenerated = typeof toGeneratedOrOptions === 'function' ? toGeneratedOrOptions : defaultToGenerated;
    const { filter, prefix, suffix, separator, appendNewLineIfNotEmpty, skipNewLineAfterLastItem } = typeof toGeneratedOrOptions === 'object' ? toGeneratedOrOptions : options;
    const prefixFunc = typeof prefix === 'function' ? prefix : (() => prefix);
    const suffixFunc = typeof suffix === 'function' ? suffix : (() => suffix);
    return reduceWithIsLast(iterable, (node, it, i, isLast) => {
        if (filter && !filter(it, i, isLast)) {
            return node;
        }
        const content = toGenerated(it, i, isLast);
        return content === undefined ? /* in this case don't append anything to */ node : /* otherwise: */ (node !== null && node !== void 0 ? node : (node = new CompositeGeneratorNode()))
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
        !node.isEmpty() && !!appendNewLineIfNotEmpty && (!isLast || !skipNewLineAfterLastItem));
    });
}
// implementation:
export function joinTracedToNode(source, property) {
    return (iterable, toGeneratedOrOptions, options) => {
        options !== null && options !== void 0 ? options : (options = typeof toGeneratedOrOptions === 'object' ? toGeneratedOrOptions : undefined);
        const toGenerated = typeof toGeneratedOrOptions === 'function' ? toGeneratedOrOptions : defaultToGenerated;
        return traceToNode(source, property)(joinToNode(iterable, source && property ? (element, index, isLast) => traceToNode(source, property, index)(toGenerated(element, index, isLast)) : toGenerated, options));
    };
}
// implementation:
export function joinTracedToNodeIf(condition, source, property) {
    return condition ? joinTracedToNode((typeof source === 'function' ? source() : source), property) : () => undefined;
}
function reduceWithIsLast(iterable, callbackfn, initial) {
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
//# sourceMappingURL=node-joiner.js.map