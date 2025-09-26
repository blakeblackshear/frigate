"use strict";

const cacheStore = new WeakMap();

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @template T
 * @typedef {(...args: any) => T} FunctionReturning
 */

/**
 * @template T
 * @param {FunctionReturning<T>} fn memorized function
 * @param {({ cache?: Map<string, { data: T }> } | undefined)=} cache cache
 * @param {((value: T) => T)=} callback callback
 * @returns {FunctionReturning<T>} new function
 */
function memorize(fn, {
  cache = new Map()
} = {}, callback = undefined) {
  // eslint-disable-next-line jsdoc/no-restricted-syntax
  /**
   * @param {any} arguments_ args
   * @returns {any} result
   */
  const memoized = (...arguments_) => {
    const [key] = arguments_;
    const cacheItem = cache.get(key);
    if (cacheItem) {
      return cacheItem.data;
    }

    // @ts-expect-error
    let result = fn.apply(this, arguments_);
    if (callback) {
      result = callback(result);
    }
    cache.set(key, {
      data: result
    });
    return result;
  };
  cacheStore.set(memoized, cache);
  return memoized;
}
module.exports = memorize;