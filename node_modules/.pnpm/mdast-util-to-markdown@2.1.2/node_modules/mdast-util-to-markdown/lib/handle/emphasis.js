/**
 * @import {Info, State} from 'mdast-util-to-markdown'
 * @import {Emphasis, Parents} from 'mdast'
 */

import {checkEmphasis} from '../util/check-emphasis.js'
import {encodeCharacterReference} from '../util/encode-character-reference.js'
import {encodeInfo} from '../util/encode-info.js'

emphasis.peek = emphasisPeek

/**
 * @param {Emphasis} node
 * @param {Parents | undefined} _
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
export function emphasis(node, _, state, info) {
  const marker = checkEmphasis(state)
  const exit = state.enter('emphasis')
  const tracker = state.createTracker(info)
  const before = tracker.move(marker)

  let between = tracker.move(
    state.containerPhrasing(node, {
      after: marker,
      before,
      ...tracker.current()
    })
  )
  const betweenHead = between.charCodeAt(0)
  const open = encodeInfo(
    info.before.charCodeAt(info.before.length - 1),
    betweenHead,
    marker
  )

  if (open.inside) {
    between = encodeCharacterReference(betweenHead) + between.slice(1)
  }

  const betweenTail = between.charCodeAt(between.length - 1)
  const close = encodeInfo(info.after.charCodeAt(0), betweenTail, marker)

  if (close.inside) {
    between = between.slice(0, -1) + encodeCharacterReference(betweenTail)
  }

  const after = tracker.move(marker)

  exit()

  state.attentionEncodeSurroundingInfo = {
    after: close.outside,
    before: open.outside
  }
  return before + between + after
}

/**
 * @param {Emphasis} _
 * @param {Parents | undefined} _1
 * @param {State} state
 * @returns {string}
 */
function emphasisPeek(_, _1, state) {
  return state.options.emphasis || '*'
}
