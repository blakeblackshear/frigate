/**
 * @typedef {import('estree-jsx').Node} Nodes
 */

/**
 * @typedef Options
 *   Configuration.
 * @property {boolean | null | undefined} [dirty=false]
 *   Leave discouraged fields in the tree (default: `false`).
 */

/**
 * @template T
 * @template U
 * @typedef {{[K in keyof T]: T[K] extends U ? K : never}[keyof T]} KeysOfType
 */

/**
 * @template T
 * @typedef {Exclude<KeysOfType<T, Exclude<T[keyof T], undefined>>, undefined>} RequiredKeys
 */

/**
 * @template T
 * @typedef {Exclude<keyof T, RequiredKeys<T>>} OptionalKeys
 */

import {visit} from 'estree-util-visit'
import {positionFromEstree} from 'unist-util-position-from-estree'

/** @type {Options} */
const emptyOptions = {}

/**
 * Turn an estree into an esast.
 *
 * @template {Nodes} Kind
 *   Node kind.
 * @param {Kind} estree
 *   estree.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Kind}
 *   Clean clone of `estree`.
 */
export function fromEstree(estree, options) {
  const settings = options || emptyOptions
  /** @type {Kind} */
  // Drop the `Node` and such constructors on Acorn nodes.
  const esast = JSON.parse(JSON.stringify(estree, ignoreBigint))

  visit(esast, {
    leave(node) {
      const position = positionFromEstree(node)

      if (!settings.dirty) {
        // Acorn specific.
        // @ts-expect-error: acorn adds this.
        if ('end' in node) remove(node, 'end')
        // @ts-expect-error: acorn adds this.
        if ('start' in node) remove(node, 'start')
        if (node.type === 'JSXOpeningFragment') {
          // @ts-expect-error: acorn adds this, but it should not exist.
          if ('attributes' in node) remove(node, 'attributes')
          // @ts-expect-error: acorn adds this, but it should not exist.
          if ('selfClosing' in node) remove(node, 'selfClosing')
        }

        // Estree.
        if ('loc' in node) remove(node, 'loc')
        // @ts-expect-error: `JSXText` types are wrong: `raw` is optional.
        if ('raw' in node) remove(node, 'raw')

        if (node.type === 'Literal') {
          // These `value`s on bigint/regex literals represent a raw value,
          // which is an antipattern.
          if ('bigint' in node) remove(node, 'value')
          if ('regex' in node) remove(node, 'value')
        }
      }

      if (node.type === 'Literal' && 'bigint' in node) {
        const bigint = node.bigint
        const match = /0[box]/.exec(bigint.slice(0, 2).toLowerCase())

        if (match) {
          const code = match[0].charCodeAt(1)
          const base =
            code === 98 /* `x` */ ? 2 : code === 111 /* `o` */ ? 8 : 16
          node.bigint = Number.parseInt(bigint.slice(2), base).toString()
        }
      }

      // @ts-expect-error: `position` is not in `Node`, but we add it anyway
      // because it’s useful.
      node.position = position
    }
  })

  return esast
}

/**
 * @template {Nodes} Kind
 * @param {Kind} value
 * @param {OptionalKeys<Kind>} key
 * @returns {undefined}
 */
function remove(value, key) {
  delete value[key]
}

/**
 *
 * @param {string} _
 * @param {unknown} value
 * @returns {unknown}
 */
function ignoreBigint(_, value) {
  return typeof value === 'bigint' ? undefined : value
}
