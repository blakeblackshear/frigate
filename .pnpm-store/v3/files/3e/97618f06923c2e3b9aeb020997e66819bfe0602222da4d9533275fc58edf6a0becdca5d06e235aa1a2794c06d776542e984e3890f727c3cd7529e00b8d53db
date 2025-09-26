'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');
const isNum = require('./isNum');

const RESERVED_KEYWORDS = new Set(['unset', 'initial', 'inherit', 'none']);

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Record<string, {ident: string, count: number}>} */
  let cache = {};
  /** @type {{value: import('postcss-value-parser').ParsedValue}[]} */
  let declOneCache = [];
  /** @type {import('postcss').Declaration[]} */
  let declTwoCache = [];

  return {
    collect(node, encoder) {
      const { type } = node;

      if (type !== 'decl') {
        return;
      }
      const { prop } = node;

      if (/counter-(reset|increment)/i.test(prop)) {
        /** @type {unknown} */ (node.value) = valueParser(node.value).walk(
          (child) => {
            if (
              child.type === 'word' &&
              !isNum(child) &&
              !RESERVED_KEYWORDS.has(child.value.toLowerCase())
            ) {
              addToCache(child.value, encoder, cache);

              child.value = cache[child.value].ident;
            }
          }
        );

        declOneCache.push(/** @type {any} */ (node));
      } else if (/content/i.test(prop)) {
        declTwoCache.push(node);
      }
    },

    transform() {
      declTwoCache.forEach((decl) => {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            const { type } = node;

            const value = node.value.toLowerCase();

            if (
              type === 'function' &&
              (value === 'counter' || value === 'counters')
            ) {
              valueParser.walk(node.nodes, (child) => {
                if (child.type === 'word' && child.value in cache) {
                  cache[child.value].count++;

                  child.value = cache[child.value].ident;
                }
              });
            }

            if (type === 'space') {
              node.value = ' ';
            }

            return false;
          })
          .toString();
      });

      declOneCache.forEach((decl) => {
        /** @type {unknown} */ (decl.value) = decl.value
          .walk((node) => {
            if (node.type === 'word' && !isNum(node)) {
              Object.keys(cache).forEach((key) => {
                const cached = cache[key];

                if (cached.ident === node.value && !cached.count) {
                  node.value = key;
                }
              });
            }
          })
          .toString();
      });

      // reset cache after transform
      declOneCache = [];
      declTwoCache = [];
    },
  };
};
