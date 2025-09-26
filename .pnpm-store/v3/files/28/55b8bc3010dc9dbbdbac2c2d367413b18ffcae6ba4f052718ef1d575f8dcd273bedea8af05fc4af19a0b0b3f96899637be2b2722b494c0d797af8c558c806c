/**
 * Find patterns in a tree and replace them.
 *
 * The algorithm searches the tree in *preorder* for complete values in `Text`
 * nodes.
 * Partial matches are not supported.
 *
 * @param {Nodes} tree
 *   Tree to change.
 * @param {FindAndReplaceList | FindAndReplaceTuple} list
 *   Patterns to find.
 * @param {Options | null | undefined} [options]
 *   Configuration (when `find` is not `Find`).
 * @returns {undefined}
 *   Nothing.
 */
export function findAndReplace(tree: Nodes, list: FindAndReplaceList | FindAndReplaceTuple, options?: Options | null | undefined): undefined;
/**
 * Info on the match.
 */
export type RegExpMatchObject = {
    /**
     *   The index of the search at which the result was found.
     */
    index: number;
    /**
     *   A copy of the search string in the text node.
     */
    input: string;
    /**
     *   All ancestors of the text node, where the last node is the text itself.
     */
    stack: [...Array<Parents>, Text];
};
/**
 * Pattern to find.
 *
 * Strings are escaped and then turned into global expressions.
 */
export type Find = RegExp | string;
/**
 * Several find and replaces, in array form.
 */
export type FindAndReplaceList = Array<FindAndReplaceTuple>;
/**
 * Find and replace in tuple form.
 */
export type FindAndReplaceTuple = [Find, Replace?];
/**
 * Thing to replace with.
 */
export type Replace = ReplaceFunction | string | null | undefined;
/**
 * Callback called when a search matches.
 */
export type ReplaceFunction = (...parameters: any[]) => Array<PhrasingContent> | PhrasingContent | string | false | null | undefined;
/**
 * Normalized find and replace.
 */
export type Pair = [RegExp, ReplaceFunction];
/**
 * All find and replaced.
 */
export type Pairs = Array<Pair>;
/**
 * Configuration.
 */
export type Options = {
    /**
     * Test for which nodes to ignore (optional).
     */
    ignore?: Test | null | undefined;
};
import type { Nodes } from 'mdast';
import type { Parents } from 'mdast';
import type { Text } from 'mdast';
import type { PhrasingContent } from 'mdast';
import type { Test } from 'unist-util-visit-parents';
//# sourceMappingURL=index.d.ts.map