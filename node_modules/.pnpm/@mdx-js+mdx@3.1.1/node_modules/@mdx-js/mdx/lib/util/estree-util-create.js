/**
 * @import {Node} from 'estree-jsx'
 */

// Fix to show references to above types in VS Code.
''

/**
 * @param {Readonly<Node>} from
 *   Node to take from.
 * @param {Node} to
 *   Node to add to.
 * @returns {undefined}
 *   Nothing.
 */
export function create(from, to) {
  /** @type {Array<keyof Node>} */
  const fields = ['start', 'end', 'loc', 'range']
  let index = -1

  while (++index < fields.length) {
    const field = fields[index]

    if (field in from) {
      // @ts-expect-error: assume they’re settable.
      to[field] = from[field]
    }
  }
}
