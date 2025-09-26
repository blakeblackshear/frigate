/**
 * Resolve nested selectors following the CSS nesting specification.
 *
 * @example
 *
 * ```js
 * import { resolveNestedSelector } from '@csstools/selector-resolve-nested';
 * import parser from 'postcss-selector-parser';
 *
 * const selector = parser().astSync('.foo &');
 * const parent = parser().astSync('.bar');
 *
 * // .foo .bar
 * console.log(
 *   resolveNestedSelector(selector, parent).toString()
 * )
 * ```
 *
 * @packageDocumentation
 */

import type { Root } from 'postcss-selector-parser';

/**
 * Flatten a nested selector against a given parent selector.
 *
 * ⚠️ This is not a method to generate the equivalent un-nested selector.
 * It is purely a method to construct a single selector AST that contains the parts of both the current and parent selector.
 * It will not have the correct specificity and it will not match the right elements when used as a selector.
 * It will not always serialize to a valid selector.
 *
 * @param selector - The selector to resolve.
 * @param parentSelector - The parent selector to resolve against.
 * @returns The resolved selector.
 */
export declare function flattenNestedSelector(selector: Root, parentSelector: Root): Root;

/**
 * Resolve a nested selector against a given parent selector.
 *
 * @param selector - The selector to resolve.
 * @param parentSelector - The parent selector to resolve against.
 * @param options - Change how resolving happens.
 * @returns The resolved selector.
 */
export declare function resolveNestedSelector(selector: Root, parentSelector: Root, options?: ResolveOptions): Root;

export declare interface ResolveOptions {
    /**
     * If implicit `&` selectors should be prepended to the selector before resolving
     */
    ignoreImplicitNesting: boolean;
}

export { }
