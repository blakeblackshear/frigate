const arr = []
const each = arr.forEach
const slice = arr.slice

export function defaults (obj) {
  each.call(slice.call(arguments, 1), (source) => {
    if (source) {
      for (const prop in source) {
        if (obj[prop] === undefined) obj[prop] = source[prop]
      }
    }
  })
  return obj
}

export function hasXMLHttpRequest () {
  return (typeof XMLHttpRequest === 'function' || typeof XMLHttpRequest === 'object')
}

/**
 * Determine whether the given `maybePromise` is a Promise.
 *
 * @param {*} maybePromise
 *
 * @returns {Boolean}
 */
function isPromise (maybePromise) {
  return !!maybePromise && typeof maybePromise.then === 'function'
}

/**
 * Convert any value to a Promise than will resolve to this value.
 *
 * @param {*} maybePromise
 *
 * @returns {Promise}
 */
export function makePromise (maybePromise) {
  if (isPromise(maybePromise)) {
    return maybePromise
  }

  return Promise.resolve(maybePromise)
}
