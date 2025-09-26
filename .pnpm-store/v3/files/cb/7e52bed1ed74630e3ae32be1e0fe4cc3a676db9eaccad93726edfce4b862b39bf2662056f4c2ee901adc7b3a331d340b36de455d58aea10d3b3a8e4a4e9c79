/**
 * @typedef {import('estree').Comment} Comment
 * @typedef {import('estree').Node} Nodes
 */

/**
 * @typedef Fields
 *   Fields.
 * @property {boolean} leading
 *   Whether it’s leading.
 * @property {boolean} trailing
 *   Whether it’s trailing.
 *
 * @typedef State
 *   Info passed around.
 * @property {Array<Comment>} comments
 *   Comments.
 * @property {number} index
 *   Index of comment.
 */

const own = {}.hasOwnProperty

/** @type {Array<Comment>} */
const emptyComments = []

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
export function attachComments(tree, comments) {
  const list = comments ? [...comments].sort(compare) : emptyComments
  if (list.length > 0) walk(tree, {comments: list, index: 0})
}

/**
 * Attach semistandard estree comment nodes to the tree.
 *
 * @param {Nodes} node
 *   Node.
 * @param {State} state
 *   Info passed around.
 * @returns {undefined}
 *   Nothing.
 */
function walk(node, state) {
  // Done, we can quit.
  if (state.index === state.comments.length) {
    return
  }

  /** @type {Array<Nodes>} */
  const children = []
  /** @type {Array<Comment>} */
  const comments = []
  /** @type {string} */
  let key

  // Find all children of `node`
  for (key in node) {
    if (own.call(node, key)) {
      /** @type {Array<Nodes> | Nodes} */
      // @ts-expect-error: indexable.
      const value = node[key]

      // Ignore comments.
      if (value && typeof value === 'object' && key !== 'comments') {
        if (Array.isArray(value)) {
          let index = -1

          while (++index < value.length) {
            if (value[index] && typeof value[index].type === 'string') {
              children.push(value[index])
            }
          }
        } else if (typeof value.type === 'string') {
          children.push(value)
        }
      }
    }
  }

  // Sort the children.
  children.sort(compare)

  // Initial comments.
  comments.push(...slice(state, node, false, {leading: true, trailing: false}))

  let index = -1

  while (++index < children.length) {
    walk(children[index], state)
  }

  // Dangling or trailing comments.
  comments.push(
    ...slice(state, node, true, {
      leading: false,
      trailing: children.length > 0
    })
  )

  if (comments.length > 0) {
    // @ts-expect-error, yes, because they’re nonstandard.
    node.comments = comments
  }
}

/**
 * @param {State} state
 *   Info passed around.
 * @param {Nodes} node
 *   Node.
 * @param {boolean} compareEnd
 *   Whether to compare on the end (default is on start).
 * @param {Fields} fields
 *   Fields.
 * @returns {Array<Comment>}
 *   Slice from `state.comments`.
 */
function slice(state, node, compareEnd, fields) {
  /** @type {Array<Comment>} */
  const result = []

  while (
    state.comments[state.index] &&
    compare(state.comments[state.index], node, compareEnd) < 1
  ) {
    result.push(Object.assign({}, state.comments[state.index++], fields))
  }

  return result
}

/**
 * Sort two nodes (or comments).
 *
 * @param {Comment | Nodes} left
 *   A node.
 * @param {Comment | Nodes} right
 *   The other node.
 * @param {boolean | undefined} [compareEnd=false]
 *   Compare on `end` of `right`, default is to compare on `start` (default:
 *   `false`).
 * @returns {number}
 *   Sorting.
 */
function compare(left, right, compareEnd) {
  const field = compareEnd ? 'end' : 'start'

  // Offsets.
  if (left.range && right.range) {
    return left.range[0] - right.range[compareEnd ? 1 : 0]
  }

  // Points.
  if (left.loc && left.loc.start && right.loc && right.loc[field]) {
    return (
      left.loc.start.line - right.loc[field].line ||
      left.loc.start.column - right.loc[field].column
    )
  }

  // Just `start` (and `end`) on nodes.
  // Default in most parsers.
  if ('start' in left && field in right) {
    // @ts-expect-error Added by Acorn
    return left.start - right[field]
  }

  return Number.NaN
}
