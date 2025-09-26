'use strict'

let config
let tokenId = 0

const CHAR_COMMENT_REPLACEMENT = '\uFFFD' // �
const CHAR_TOKEN_REPLACEMENT = '\u00A4' // ¤
const CHAR_TOKEN_START = '\u00AB' // «
const CHAR_TOKEN_END = '\u00BB' // »

const REGEX_COMMENT_REPLACEMENT = new RegExp(CHAR_COMMENT_REPLACEMENT, 'ig')
const REGEX_TOKEN_REPLACEMENT = new RegExp(CHAR_TOKEN_REPLACEMENT, 'ig')

const PATTERN_NUMBER = '\\-?(\\d*?\\.\\d+|\\d+)'
const PATTERN_NUMBER_WITH_CALC = '(calc' + CHAR_TOKEN_REPLACEMENT + ')|(' + PATTERN_NUMBER + ')(?!d\\()'
const PATTERN_TOKEN = CHAR_TOKEN_START + '\\d+:\\d+' + CHAR_TOKEN_END // «offset:index»
const PATTERN_TOKEN_WITH_NAME = '\\w*?' + CHAR_TOKEN_START + '\\d+:\\d+' + CHAR_TOKEN_END // «offset:index»

const REGEX_COMMENT = /\/\*[^]*?\*\//igm // non-greedy
const REGEX_DIRECTIVE = /\/\*\s*!?\s*rtl:[^]*?\*\//img
const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g
const REGEX_FUNCTION = /\([^()]+\)/i
const REGEX_HEX_COLOR = /#[a-f0-9]{3,8}/ig
const REGEX_CALC = /calc/
const REGEX_TOKENS = new RegExp(PATTERN_TOKEN, 'ig')
const REGEX_TOKENS_WITH_NAME = new RegExp(PATTERN_TOKEN_WITH_NAME, 'ig')

const REGEX_COMPLEMENT = new RegExp(PATTERN_NUMBER_WITH_CALC, 'i')
const REGEX_NEGATE_ALL = new RegExp(PATTERN_NUMBER_WITH_CALC, 'ig')
const REGEX_NEGATE_ONE = new RegExp(PATTERN_NUMBER_WITH_CALC, 'i')

const DEFAULT_STRING_MAP_OPTIONS = { scope: '*', ignoreCase: true }

function compare (what, to, ignoreCase) {
  return ignoreCase
    ? what.toLowerCase() === to.toLowerCase()
    : what === to
}

function escapeRegExp (string) {
  return string.replace(REGEX_ESCAPE, '\\$&')
}

module.exports = {
  extend (dest, src) {
    if (typeof dest === 'undefined' || typeof dest !== 'object') {
      dest = {}
    }

    for (const prop in src) {
      if (!Object.prototype.hasOwnProperty.call(dest, prop)) {
        dest[prop] = src[prop]
      }
    }

    return dest
  },
  swap (value, a, b, options = DEFAULT_STRING_MAP_OPTIONS) {
    let expr = `${escapeRegExp(a)}|${escapeRegExp(b)}`
    const greedy = Object.prototype.hasOwnProperty.call(options, 'greedy') ? options.greedy : config.greedy
    if (!greedy) expr = `\\b(${expr})\\b`

    const flags = options.ignoreCase ? 'img' : 'mg'
    return value.replace(new RegExp(expr, flags), (m) => compare(m, a, options.ignoreCase) ? b : a)
  },
  swapLeftRight (value) {
    return this.swap(value, 'left', 'right')
  },
  swapLtrRtl (value) {
    return this.swap(value, 'ltr', 'rtl')
  },
  applyStringMap (value, isUrl) {
    let result = value
    for (const map of config.stringMap) {
      const options = this.extend(map.options, DEFAULT_STRING_MAP_OPTIONS)
      if (options.scope === '*' || (isUrl && options.scope === 'url') || (!isUrl && options.scope === 'selector')) {
        if (Array.isArray(map.search) && Array.isArray(map.replace)) {
          for (let mapIndex = 0; mapIndex < map.search.length; mapIndex++) {
            result = this.swap(result, map.search[mapIndex], map.replace[mapIndex % map.search.length], options)
          }
        } else {
          result = this.swap(result, map.search, map.replace, options)
        }

        if (map.exclusive === true) {
          break
        }
      }
    }

    return result
  },
  negate (value) {
    const state = this.saveTokens(value)
    state.value = state.value.replace(REGEX_NEGATE_ONE, (num) => {
      return REGEX_TOKEN_REPLACEMENT.test(num)
        ? num.replace(REGEX_TOKEN_REPLACEMENT, (m) => '(-1*' + m + ')')
        : Number.parseFloat(num) * -1
    })
    return this.restoreTokens(state)
  },
  negateAll (value) {
    const state = this.saveTokens(value)
    state.value = state.value.replace(REGEX_NEGATE_ALL, (num) => {
      return REGEX_TOKEN_REPLACEMENT.test(num)
        ? num.replace(REGEX_TOKEN_REPLACEMENT, (m) => '(-1*' + m + ')')
        : Number.parseFloat(num) * -1
    })
    return this.restoreTokens(state)
  },
  complement (value) {
    const state = this.saveTokens(value)
    state.value = state.value.replace(REGEX_COMPLEMENT, (num) => {
      return REGEX_TOKEN_REPLACEMENT.test(num)
        ? num.replace(REGEX_TOKEN_REPLACEMENT, (m) => '(100% - ' + m + ')')
        : 100 - Number.parseFloat(num)
    })
    return this.restoreTokens(state)
  },
  flipLength (value) {
    return config.useCalc ? `calc(100% - ${value})` : value
  },
  save (what, who, replacement, restorer, exclude) {
    const state = {
      value: who,
      store: [],
      replacement,
      restorer
    }
    state.value = state.value.replace(what, (c) => {
      if (exclude && exclude.test(c)) {
        return c
      }

      state.store.push(c)
      return state.replacement
    })
    return state
  },
  restore (state) {
    let index = 0
    const result = state.value.replace(state.restorer, () => state.store[index++])
    state.store.length = 0
    return result
  },
  saveComments (value) {
    return this.save(REGEX_COMMENT, value, CHAR_COMMENT_REPLACEMENT, REGEX_COMMENT_REPLACEMENT)
  },
  restoreComments (state) {
    return this.restore(state)
  },
  saveTokens (value, excludeCalc) {
    return excludeCalc === true
      ? this.save(REGEX_TOKENS_WITH_NAME, value, CHAR_TOKEN_REPLACEMENT, REGEX_TOKEN_REPLACEMENT, REGEX_CALC)
      : this.save(REGEX_TOKENS, value, CHAR_TOKEN_REPLACEMENT, REGEX_TOKEN_REPLACEMENT)
  },
  restoreTokens (state) {
    return this.restore(state)
  },
  guard (what, who) {
    const state = {
      value: who,
      store: [],
      offset: tokenId++,
      token: CHAR_TOKEN_START + tokenId
    }

    while (what.test(state.value)) {
      state.value = state.value.replace(what, (m) => {
        state.store.push(m)
        return `${state.token}:${state.store.length}${CHAR_TOKEN_END}`
      })
    }

    return state
  },
  unguard (state, callback) {
    const detokenizer = new RegExp('(\\w*?)' + state.token + ':(\\d+)' + CHAR_TOKEN_END, 'i')
    while (detokenizer.test(state.value)) {
      state.value = state.value.replace(detokenizer, (match, name, index) => {
        const value = state.store[index - 1]
        return typeof callback === 'function'
          ? name + callback(value, name)
          : name + value
      })
    }

    return state.value
  },
  guardHexColors (value) {
    return this.guard(REGEX_HEX_COLOR, value)
  },
  unguardHexColors (state, callback) {
    return this.unguard(state, callback)
  },
  guardFunctions (value) {
    return this.guard(REGEX_FUNCTION, value)
  },
  unguardFunctions (state, callback) {
    return this.unguard(state, callback)
  },
  trimDirective (value) {
    return value.replace(REGEX_DIRECTIVE, '')
  },
  regexCache: {},
  regexDirective (name) {
    // /(?:\/\*(?:!)?rtl:ignore(?::)?)([^]*?)(?:\*\/)/img
    this.regexCache[name] = this.regexCache[name] || new RegExp('(?:\\/\\*\\s*(?:!)?\\s*rtl:' + (name ? escapeRegExp(name) + '(?::)?' : '') + ')([^]*?)(?:\\*\\/)', 'img')
    return this.regexCache[name]
  },
  regex (what, options) {
    let expression = ''

    for (const exp of what) {
      switch (exp) {
        case 'percent':
          expression += `|(${PATTERN_NUMBER}%)`
          break
        case 'length':
          expression += `|(${PATTERN_NUMBER})(?:ex|ch|r?em|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc)?`
          break
        case 'number':
          expression += `|(${PATTERN_NUMBER})`
          break
        case 'position':
          expression += '|(left|center|right|top|bottom)'
          break
        case 'calc':
          expression += `|(calc${PATTERN_TOKEN})`
          break
        case 'func':
          expression += `|(\\w+${PATTERN_TOKEN})`
          break
      }
    }

    return new RegExp(expression.slice(1), options)
  },
  isLastOfType (node) {
    let isLast = true
    let next = node.next()

    while (next) {
      if (next.type === node.type) {
        isLast = false
        break
      }

      next = next.next()
    }

    return isLast
  },
  /**
   * Simple breakable each returning false if the callback returns false
   * otherwise it returns true
   */
  each (array, callback) {
    return !array.some((element) => callback(element) === false)
  }
}

module.exports.configure = function (configuration) {
  config = configuration
  return this
}
