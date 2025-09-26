/**
 * @import {Code, Effects, State, TokenizeContext, TokenType} from 'micromark-util-types'
 */

import {asciiAlpha, asciiAlphanumeric} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol'

/**
 * @this {TokenizeContext}
 * @param {Effects} effects
 * @param {State} ok
 * @param {State} nok
 * @param {TokenType} type
 */
export function factoryName(effects, ok, nok, type) {
  const self = this

  return start

  /** @type {State} */
  function start(code) {
    if (asciiAlpha(code)) {
      effects.enter(type)
      effects.consume(code)
      return name
    }

    return nok(code)
  }

  /** @type {State} */
  function name(code) {
    if (
      code === codes.dash ||
      code === codes.underscore ||
      asciiAlphanumeric(code)
    ) {
      effects.consume(code)
      return name
    }

    effects.exit(type)
    return self.previous === codes.dash || self.previous === codes.underscore
      ? nok(code)
      : ok(code)
  }
}
