/**
 * Pass a hast tree through an HTML parser, which will fix nesting, and turn
 * raw nodes into actual nodes.
 *
 * @param {Nodes} tree
 *   Original hast tree to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Nodes}
 *   Parsed again tree.
 */
export function raw(tree: Nodes, options?: Options | null | undefined): Nodes;
/**
 * Info passed around about the current state.
 */
export type State = {
    /**
     *   Add a hast node to the parser.
     */
    handle: (node: Nodes) => undefined;
    /**
     *   User configuration.
     */
    options: Options;
    /**
     *   Current parser.
     */
    parser: Parser<DefaultTreeAdapterMap>;
    /**
     *   Whether there are stitches.
     */
    stitches: boolean;
};
/**
 * Custom comment-like value we pass through parse5, which contains a
 * replacement node that we’ll swap back in afterwards.
 */
export type Stitch = {
    /**
     *   Node type.
     */
    type: "comment";
    /**
     *   Replacement value.
     */
    value: {
        stitch: Nodes;
    };
};
import type { Nodes } from 'hast';
import type { Options } from 'hast-util-raw';
import { Parser } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
//# sourceMappingURL=index.d.ts.map