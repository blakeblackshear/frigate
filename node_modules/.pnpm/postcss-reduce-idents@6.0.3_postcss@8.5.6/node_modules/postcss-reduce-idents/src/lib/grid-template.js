'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');
const isNum = require('./isNum');

const RESERVED_KEYWORDS = new Set([
  'auto',
  'span',
  'inherit',
  'initial',
  'unset',
]);

const gridTemplateProperties = new Set([
  'grid-template',
  'grid-template-areas',
  'grid-template-columns',
  'grid-template-rows',
]);

const gridChildProperties = new Set([
  'grid-area',
  'grid-column',
  'grid-row',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
]);

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Record<string, {ident: string, count: number}>} */
  let cache = {};
  /** @type {import('postcss').Declaration[]} */
  let declCache = [];

  return {
    collect(node, encoder) {
      if (node.type !== 'decl') {
        return;
      }

      if (gridTemplateProperties.has(node.prop.toLowerCase())) {
        valueParser(node.value).walk((child) => {
          if (child.type === 'string') {
            child.value.split(/\s+/).forEach((word) => {
              if (/\.+/.test(word)) {
                // reduce empty zones to a single `.`
                node.value = node.value.replace(word, '.');
              } else if (word && !RESERVED_KEYWORDS.has(word.toLowerCase())) {
                addToCache(word, encoder, cache);
              }
            });
          }
          /* handle gridline name lists like [name1 name2] */
          if (child.type === 'word') {
            const word = child.value;
            if (word.startsWith('[') && word.endsWith(']')) {
              const gridLine = word.slice(1, -1);
              addToCache(gridLine, encoder, cache);
            } else if (word.startsWith('[')) {
              const gridLine = word.slice(1);
              addToCache(gridLine, encoder, cache);
            } else if (word.endsWith(']')) {
              const gridLine = word.slice(0, -1);
              addToCache(gridLine, encoder, cache);
            }
          }
        });

        declCache.push(node);
      } else if (gridChildProperties.has(node.prop.toLowerCase())) {
        valueParser(node.value).walk((child) => {
          if (
            child.type === 'word' &&
            !RESERVED_KEYWORDS.has(child.value.toLowerCase())
          ) {
            addToCache(child.value, encoder, cache);
          }
        });

        declCache.push(node);
      }
    },

    transform() {
      declCache.forEach((decl) => {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            if (gridTemplateProperties.has(decl.prop.toLowerCase())) {
              node.value.split(/\s+/).forEach((word) => {
                if (word in cache) {
                  node.value = node.value.replace(word, cache[word].ident);
                }
                /* replace gridline names inside lists like [name] */
                if (
                  word.startsWith('[') &&
                  word.endsWith(']') &&
                  word.slice(1, -1) in cache
                ) {
                  const gridLine = word.slice(1, -1);
                  node.value = node.value.replace(
                    gridLine,
                    cache[gridLine].ident
                  );
                } else if (word.startsWith('[') && word.slice(1) in cache) {
                  const gridLine = word.slice(1);
                  node.value = node.value.replace(
                    gridLine,
                    cache[gridLine].ident
                  );
                } else if (word.endsWith(']') && word.slice(0, -1) in cache) {
                  const gridLine = word.slice(0, -1);
                  node.value = node.value.replace(
                    gridLine,
                    cache[gridLine].ident
                  );
                }
              });
              node.value = node.value.replace(/\s+/g, ' '); // merge white-spaces
            }

            if (
              gridChildProperties.has(decl.prop.toLowerCase()) &&
              !isNum(node)
            ) {
              if (node.value in cache) {
                node.value = cache[node.value].ident;
              }
            }

            return false;
          })
          .toString();
      });

      // reset cache after transform
      declCache = [];
    },
  };
};
