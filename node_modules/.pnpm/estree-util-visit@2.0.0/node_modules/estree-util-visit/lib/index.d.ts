/**
 * Visit nodes, with ancestral information.
 *
 * This algorithm performs *depth-first* *tree traversal* in *preorder*
 * (**NLR**) and/or *postorder* (**LRN**).
 *
 * Walking the tree is an intensive task.
 * Make use of the return values of the visitor(s) when possible.
 * Instead of walking a tree multiple times, walk it once, use `unist-util-is`
 * to check if a node matches, and then perform different operations.
 *
 * @param {Node} tree
 *   Tree to traverse
 * @param {Visitor | Visitors | null | undefined} [visitor]
 *   Handle each node (optional).
 * @returns {undefined}
 *   Nothing.
 */
export function visit(tree: Node, visitor?: Visitor | Visitors | null | undefined): undefined;
/**
 * Continue traversing as normal.
 */
export const CONTINUE: unique symbol;
/**
 * Stop traversing immediately.
 */
export const EXIT: unique symbol;
/**
 * Do not traverse this node’s children.
 */
export const SKIP: unique symbol;
export type Node = import('estree-jsx').Node;
/**
 * Union of the action types.
 */
export type Action = typeof CONTINUE | typeof EXIT | typeof SKIP;
/**
 * List with one or two values, the first an action, the second an index.
 */
export type ActionTuple = [(Action | null | undefined | void)?, (Index | null | undefined)?];
/**
 * Move to the sibling at `index` next (after node itself is completely
 * traversed), when moving in an array.
 *
 * Useful if mutating the tree, such as removing the node the visitor is
 * currently on, or any of its previous siblings.
 * Results less than 0 or greater than or equal to `children.length` stop
 * traversing the parent.
 */
export type Index = number;
/**
 * Handle a node.
 *
 * Visitors are free to transform `node`.
 * They can also transform the parent of node (the last of `ancestors`).
 *
 * Replacing `node` itself, if `SKIP` is not returned, still causes its
 * descendants to be walked (which is a bug).
 *
 * When adding or removing previous siblings of `node`, the `Visitor` should
 * return a new `Index` to specify the sibling to traverse after `node` is
 * traversed.
 * Adding or removing next siblings of `node` is handled as expected without
 * needing to return a new `Index`.
 */
export type Visitor = (node: Node, key: string | undefined, index: number | undefined, ancestors: Array<Node>) => Action | ActionTuple | Index | null | undefined | void;
/**
 * Handle nodes when entering (preorder) and leaving (postorder).
 */
export type Visitors = {
    /**
     * Handle nodes when entering (preorder) (optional).
     */
    enter?: Visitor | null | undefined;
    /**
     * Handle nodes when leaving (postorder) (optional).
     */
    leave?: Visitor | null | undefined;
};
