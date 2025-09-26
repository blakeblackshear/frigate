'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');

const RESERVED_KEYWORDS = new Set([
  'unset',
  'initial',
  'inherit',
  'none',
  'inline',
  'outside',
  'disc',
  'circle',
  'square',
  'decimal',
  'cjk-decimal',
  'decimal-leading-zero',
  'lower-roman',
  'upper-roman',
  'lower-greek',
  'lower-alpha',
  'lower-latin',
  'upper-alpha',
  'upper-latin',
  'arabic-indic',
  'armenian',
  'bengali',
  'cambodian',
  'cjk-earthly-branch',
  'cjk-heavenly-stem',
  'cjk-ideographic',
  'devanagari',
  'ethiopic-numeric',
  'georgian',
  'gujarati',
  'gurmukhi',
  'hebrew',
  'hiragana',
  'hiragana-iroha',
  'japanese-formal',
  'japanese-informal',
  'kannada',
  'katakana',
  'katakana-iroha',
  'khmer',
  'korean-hangul-formal',
  'korean-hanja-formal',
  'korean-hanja-informal',
  'lao',
  'lower-armenian',
  'malayalam',
  'mongolian',
  'myanmar',
  'oriya',
  'persian',
  'simp-chinese-formal',
  'simp-chinese-informal',
  'tamil',
  'telugu',
  'thai',
  'tibetan',
  'trad-chinese-formal',
  'trad-chinese-informal',
  'upper-armenian',
  'disclosure-open',
  'disclosure-close',
]);

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Record<string, {ident: string, count: number}>} */
  let cache = {};
  /** @type {import('postcss').AtRule[]} */
  let atRules = [];
  /** @type {import('postcss').Declaration[]} */
  let decls = [];

  return {
    collect(node, encoder) {
      const { type } = node;

      if (
        type === 'atrule' &&
        /counter-style/i.test(node.name) &&
        !RESERVED_KEYWORDS.has(node.params.toLowerCase())
      ) {
        addToCache(node.params, encoder, cache);

        atRules.push(node);
      }

      if (type === 'decl' && /(list-style|system)/i.test(node.prop)) {
        decls.push(node);
      }
    },

    transform() {
      // Iterate each property and change their names
      decls.forEach((decl) => {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            if (node.type === 'word' && node.value in cache) {
              cache[node.value].count++;

              node.value = cache[node.value].ident;
            }
          })
          .toString();
      });

      // Iterate each at rule and change their name if references to them have been found
      atRules.forEach((rule) => {
        const cached = cache[rule.params];

        if (cached && cached.count > 0) {
          rule.params = cached.ident;
        }
      });

      // reset cache after transform
      atRules = [];
      decls = [];
    },
  };
};
