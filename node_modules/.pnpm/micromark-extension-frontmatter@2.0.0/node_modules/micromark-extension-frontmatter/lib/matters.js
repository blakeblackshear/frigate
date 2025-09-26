/**
 * @typedef {'toml' | 'yaml'} Preset
 *   Known name of a frontmatter style.
 *
 * @typedef Info
 *   Sequence.
 *
 *   Depending on how this structure is used, it reflects a marker or a fence.
 * @property {string} close
 *   Closing.
 * @property {string} open
 *   Opening.
 *
 * @typedef MatterProps
 *   Fields describing a kind of matter.
 * @property {string} type
 *   Node type to tokenize as.
 * @property {boolean | null | undefined} [anywhere=false]
 *   Whether matter can be found anywhere in the document, normally, only matter
 *   at the start of the document is recognized.
 *
 *   > 👉 **Note**: using this is a terrible idea.
 *   > It’s called frontmatter, not matter-in-the-middle or so.
 *   > This makes your markdown less portable.
 *
 * @typedef MarkerProps
 *   Marker configuration.
 * @property {Info | string} marker
 *   Character repeated 3 times, used as complete fences.
 *
 *   For example the character `'-'` will result in `'---'` being used as the
 *   fence
 *   Pass `open` and `close` to specify different characters for opening and
 *   closing fences.
 * @property {never} [fence]
 *   If `marker` is set, `fence` must not be set.
 *
 * @typedef FenceProps
 *   Fence configuration.
 * @property {Info | string} fence
 *   Complete fences.
 *
 *   This can be used when fences contain different characters or lengths
 *   other than 3.
 *   Pass `open` and `close` to interface to specify different characters for opening and
 *   closing fences.
 * @property {never} [marker]
 *   If `fence` is set, `marker` must not be set.
 *
 * @typedef {(MatterProps & FenceProps) | (MatterProps & MarkerProps)} Matter
 *   Fields describing a kind of matter.
 *
 *   > 👉 **Note**: using `anywhere` is a terrible idea.
 *   > It’s called frontmatter, not matter-in-the-middle or so.
 *   > This makes your markdown less portable.
 *
 *   > 👉 **Note**: `marker` and `fence` are mutually exclusive.
 *   > If `marker` is set, `fence` must not be set, and vice versa.
 *
 * @typedef {Matter | Preset | Array<Matter | Preset>} Options
 *   Configuration.
 */

import {fault} from 'fault'
const own = {}.hasOwnProperty
const markers = {
  yaml: '-',
  toml: '+'
}

/**
 * Simplify one or more options.
 *
 * @param {Options | null | undefined} [options='yaml']
 *   Configuration (default: `'yaml'`).
 * @returns {Array<Matter>}
 *   List of matters.
 */
export function matters(options) {
  /** @type {Array<Matter>} */
  const result = []
  let index = -1

  /** @type {Array<Matter | Preset>} */
  const presetsOrMatters = Array.isArray(options)
    ? options
    : options
    ? [options]
    : ['yaml']
  while (++index < presetsOrMatters.length) {
    result[index] = matter(presetsOrMatters[index])
  }
  return result
}

/**
 * Simplify an option.
 *
 * @param {Matter | Preset} option
 *   Configuration.
 * @returns {Matter}
 *   Matters.
 */
function matter(option) {
  let result = option
  if (typeof result === 'string') {
    if (!own.call(markers, result)) {
      throw fault('Missing matter definition for `%s`', result)
    }
    result = {
      type: result,
      marker: markers[result]
    }
  } else if (typeof result !== 'object') {
    throw fault('Expected matter to be an object, not `%j`', result)
  }
  if (!own.call(result, 'type')) {
    throw fault('Missing `type` in matter `%j`', result)
  }
  if (!own.call(result, 'fence') && !own.call(result, 'marker')) {
    throw fault('Missing `marker` or `fence` in matter `%j`', result)
  }
  return result
}
