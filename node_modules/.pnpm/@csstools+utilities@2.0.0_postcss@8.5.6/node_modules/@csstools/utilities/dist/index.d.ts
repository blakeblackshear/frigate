import type { Declaration } from 'postcss';
import type { Node } from 'postcss';

/**
 * Check if a declaration has a fallback.
 * Returns true if a declaration with the same property name appears before the current declaration.
 *
 * @param {Declaration} node The declaration node to check
 * @returns {boolean} Whether the declaration has a fallback
 */
export declare function hasFallback(node: Declaration): boolean;

/**
 * Check if a node has a `@supports` at-rule ancestor with a given regex in its params.
 *
 * @param {Node} node The node to check
 * @param {{ test(str: string): boolean }} predicate The test to match against the `@supports` at-rule's params
 * @returns {boolean}
 */
export declare function hasSupportsAtRuleAncestor(node: Node, predicate: {
    test(str: string): boolean;
}): boolean;

export { }
