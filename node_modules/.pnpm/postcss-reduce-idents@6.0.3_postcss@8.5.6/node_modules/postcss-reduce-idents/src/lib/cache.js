'use strict';
/**
 * @param {string} value
 * @param {(value: string, num: number) => string} encoder
 * @param {Record<string, {ident: string, count: number}>} cache
 * @return {void}
 */
module.exports = function (value, encoder, cache) {
  if (cache[value]) {
    return;
  }

  cache[value] = {
    ident: encoder(value, Object.keys(cache).length),
    count: 0,
  };
};
