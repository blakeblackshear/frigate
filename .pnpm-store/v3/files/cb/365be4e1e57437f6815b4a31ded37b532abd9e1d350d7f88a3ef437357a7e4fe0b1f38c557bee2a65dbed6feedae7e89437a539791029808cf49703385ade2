/**
 * @typedef {import('estree-jsx').Node} Node
 */

/**
 * @typedef {CONTINUE | EXIT | SKIP} Action
 *   Union of the action types.
 *
 * @typedef {[(Action | null | undefined | void)?, (Index | null | undefined)?]} ActionTuple
 *   List with one or two values, the first an action, the second an index.
 *
 * @typedef {number} Index
 *   Move to the sibling at `index` next (after node itself is completely
 *   traversed), when moving in an array.
 *
 *   Useful if mutating the tree, such as removing the node the visitor is
 *   currently on, or any of its previous siblings.
 *   Results less than 0 or greater than or equal to `children.length` stop
 *   traversing the parent.
 */

/**
 * @callback Visitor
 *   Handle a node.
 *
 *   Visitors are free to transform `node`.
 *   They can also transform the parent of node (the last of `ancestors`).
 *
 *   Replacing `node` itself, if `SKIP` is not returned, still causes its
 *   descendants to be walked (which is a bug).
 *
 *   When adding or removing previous siblings of `node`, the `Visitor` should
 *   return a new `Index` to specify the sibling to traverse after `node` is
 *   traversed.
 *   Adding or removing next siblings of `node` is handled as expected without
 *   needing to return a new `Index`.
 * @param {Node} node
 *   Found node.
 * @param {string | undefined} key
 *   Field at which `node` lives in its parent (or where a list of nodes lives).
 * @param {number | undefined} index
 *   Index where `node` lives if `parent[key]` is an array.
 * @param {Array<Node>} ancestors
 *   Ancestors of `node`.
 * @returns {Action | ActionTuple | Index | null | undefined | void}
 *   What to do next.
 *
 *   An `Index` is treated as a tuple of `[CONTINUE, Index]`.
 *   An `Action` is treated as a tuple of `[Action]`.
 *
 *   Passing a tuple back only makes sense if the `Action` is `SKIP`.
 *   When the `Action` is `EXIT`, that action can be returned.
 *   When the `Action` is `CONTINUE`, `Index` can be returned.
 */

/**
 * @typedef Visitors
 *   Handle nodes when entering (preorder) and leaving (postorder).
 * @property {Visitor | null | undefined} [enter]
 *   Handle nodes when entering (preorder) (optional).
 * @property {Visitor | null | undefined} [leave]
 *   Handle nodes when leaving (postorder) (optional).
 */

import {color} from 'estree-util-visit/do-not-use-color'

const own = {}.hasOwnProperty

/**
 * Continue traversing as normal.
 */
export const CONTINUE = Symbol('continue')

/**
 * Stop traversing immediately.
 */
export const EXIT = Symbol('exit')

/**
 * Do not traverse this node’s children.
 */
export const SKIP = Symbol('skip')

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
export function visit(tree, visitor) {
  /** @type {Visitor | undefined} */
  let enter
  /** @type {Visitor | undefined} */
  let leave

  if (typeof visitor === 'function') {
    enter = visitor
  } else if (visitor && typeof visitor === 'object') {
    if (visitor.enter) enter = visitor.enter
    if (visitor.leave) leave = visitor.leave
  }

  build(tree, undefined, undefined, [])()

  /**
   * @param {Node} node
   * @param {string | undefined} key
   * @param {number | undefined} index
   * @param {Array<Node>} parents
   */
  function build(node, key, index, parents) {
    if (nodelike(node)) {
      visit.displayName = 'node (' + color(node.type) + ')'
    }

    return visit

    /**
     * @returns {ActionTuple}
     */
    function visit() {
      /** @type {ActionTuple} */
      const result = enter ? toResult(enter(node, key, index, parents)) : []

      if (result[0] === EXIT) {
        return result
      }

      if (result[0] !== SKIP) {
        /** @type {keyof node} */
        let cKey

        for (cKey in node) {
          if (
            own.call(node, cKey) &&
            node[cKey] &&
            typeof node[cKey] === 'object' &&
            // @ts-expect-error: custom esast extension.
            cKey !== 'data' &&
            // @ts-expect-error: custom esast extension.
            cKey !== 'position'
          ) {
            const grandparents = parents.concat(node)
            /** @type {unknown} */
            const value = node[cKey]

            if (Array.isArray(value)) {
              const nodes = /** @type {Array<unknown>} */ (value)
              let cIndex = 0

              while (cIndex > -1 && cIndex < nodes.length) {
                const subvalue = nodes[cIndex]

                if (nodelike(subvalue)) {
                  const subresult = build(
                    subvalue,
                    cKey,
                    cIndex,
                    grandparents
                  )()
                  if (subresult[0] === EXIT) return subresult
                  cIndex =
                    typeof subresult[1] === 'number' ? subresult[1] : cIndex + 1
                } else {
                  cIndex++
                }
              }
            } else if (nodelike(value)) {
              const subresult = build(value, cKey, undefined, grandparents)()
              if (subresult[0] === EXIT) return subresult
            }
          }
        }
      }

      return leave ? toResult(leave(node, key, index, parents)) : result
    }
  }
}

/**
 * Turn a return value into a clean result.
 *
 * @param {Action | ActionTuple | Index | null | undefined | void} value
 *   Valid return values from visitors.
 * @returns {ActionTuple}
 *   Clean result.
 */
function toResult(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'number') {
    return [CONTINUE, value]
  }

  return [value]
}

/**
 * Check if something looks like a node.
 *
 * @param {unknown} value
 *   Anything.
 * @returns {value is Node}
 *   Whether `value` looks like a node.
 */
function nodelike(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      typeof value.type === 'string' &&
      value.type.length > 0
  )
}
