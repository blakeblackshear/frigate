/**
 * Attach semistandard estree comment nodes to the tree.
 *
 * This mutates the given `tree`.
 * It takes `comments`, walks the tree, and adds comments as close as possible
 * to where they originated.
 *
 * Comment nodes are given two boolean fields: `leading` (`true` for
 * `/* a *\/ b`) and `trailing` (`true` for `a /* b *\/`).
 * Both fields are `false` for dangling comments: `[/* a *\/]`.
 * This is what `recast` uses too, and is somewhat similar to Babel, which is
 * not estree but instead uses `leadingComments`, `trailingComments`, and
 * `innerComments` arrays on nodes.
 *
 * The algorithm checks any node: even recent (or future) proposals or
 * nonstandard syntax such as JSX, because it ducktypes to find nodes instead
 * of having a list of visitor keys.
 *
 * The algorithm supports `loc` fields (line/column), `range` fields (offsets),
 * and direct `start` / `end` fields.
 *
 * @template {Nodes} Tree
 *   Node type.
 * @param {Tree} tree
 *   Tree to attach to.
 * @param {Array<Comment> | null | undefined} [comments]
 *   List of comments (optional).
 * @returns {undefined}
 *   Nothing.
 */
export function attachComments<Tree extends import("estree").Node>(tree: Tree, comments?: Array<Comment> | null | undefined): undefined;
export type Comment = import('estree').Comment;
export type Nodes = import('estree').Node;
/**
 * Fields.
 */
export type Fields = {
    /**
     *   Whether it’s leading.
     */
    leading: boolean;
    /**
     *   Whether it’s trailing.
     */
    trailing: boolean;
};
/**
 * Info passed around.
 */
export type State = {
    /**
     *   Comments.
     */
    comments: Array<Comment>;
    /**
     *   Index of comment.
     */
    index: number;
};
