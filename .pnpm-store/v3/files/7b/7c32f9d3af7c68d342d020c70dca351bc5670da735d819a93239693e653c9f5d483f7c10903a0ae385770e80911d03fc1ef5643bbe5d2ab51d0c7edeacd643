/**
 * @import {} from 'recma-parse'
 * @import {} from 'recma-stringify'
 * @import {Processor} from 'unified'
 */

import jsxPlugin from 'acorn-jsx'
import {jsx as jsxHandlers} from 'estree-util-to-js'

/**
 * Plugin to add support for parsing and serializing JSX.
 *
 * @this {Processor}
 *   Processor.
 * @returns {undefined}
 *   Nothing.
 */
export default function recmaJsx() {
  const data = this.data()
  const settings = data.settings || (data.settings = {})
  const handlers = settings.handlers || (settings.handlers = {})
  const plugins = settings.plugins || (settings.plugins = [])

  // No useful options yet.
  plugins.push(jsxPlugin())
  Object.assign(handlers, jsxHandlers)
}
