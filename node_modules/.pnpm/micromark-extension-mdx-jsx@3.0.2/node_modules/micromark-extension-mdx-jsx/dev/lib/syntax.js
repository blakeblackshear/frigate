/**
 * @import {Options} from 'micromark-extension-mdx-jsx'
 * @import {AcornOptions} from 'micromark-util-events-to-acorn'
 * @import {Extension} from 'micromark-util-types'
 */

import {codes} from 'micromark-util-symbol'
import {jsxText} from './jsx-text.js'
import {jsxFlow} from './jsx-flow.js'

/**
 * Create an extension for `micromark` to enable MDX JSX syntax.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   JSX syntax.
 */
export function mdxJsx(options) {
  const settings = options || {}
  const acorn = settings.acorn
  /** @type {AcornOptions | undefined} */
  let acornOptions

  if (acorn) {
    if (!acorn.parse || !acorn.parseExpressionAt) {
      throw new Error(
        'Expected a proper `acorn` instance passed in as `options.acorn`'
      )
    }

    acornOptions = Object.assign(
      {ecmaVersion: 2024, sourceType: 'module'},
      settings.acornOptions,
      {locations: true}
    )
  } else if (settings.acornOptions || settings.addResult) {
    throw new Error('Expected an `acorn` instance passed in as `options.acorn`')
  }

  return {
    flow: {
      [codes.lessThan]: jsxFlow(acorn || undefined, {
        acornOptions,
        addResult: settings.addResult || undefined
      })
    },
    text: {
      [codes.lessThan]: jsxText(acorn || undefined, {
        acornOptions,
        addResult: settings.addResult || undefined
      })
    }
  }
}
