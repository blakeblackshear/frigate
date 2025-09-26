'use strict';
const { dirname } = require('path');
const browserslist = require('browserslist');
const valueParser = require('postcss-value-parser');

const regexLowerCaseUPrefix = /^u(?=\+)/;

/**
 * @param {string} range
 * @return {string}
 */
function unicode(range) {
  const values = range.slice(2).split('-');

  if (values.length < 2) {
    return range;
  }

  const left = values[0].split('');
  const right = values[1].split('');

  if (left.length !== right.length) {
    return range;
  }

  const merged = mergeRangeBounds(left, right);

  if (merged) {
    return merged;
  }

  return range;
}
/**
 * @param {string[]} left
 * @param {string[]} right
 * @return {false|string}
 */
function mergeRangeBounds(left, right) {
  let questionCounter = 0;
  let group = 'u+';
  for (const [index, value] of left.entries()) {
    if (value === right[index] && questionCounter === 0) {
      group = group + value;
    } else if (value === '0' && right[index] === 'f') {
      questionCounter++;
      group = group + '?';
    } else {
      return false;
    }
  }
  // The maximum number of wildcard characters (?) for ranges is 5.
  if (questionCounter < 6) {
    return group;
  } else {
    return false;
  }
}

/**
 * IE and Edge before 16 version ignore the unicode-range if the 'U' is lowercase
 *
 * https://caniuse.com/#search=unicode-range
 *
 * @param {string} browser
 * @return {boolean}
 */
function hasLowerCaseUPrefixBug(browser) {
  return browserslist('ie <=11, edge <= 15').includes(browser);
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value, isLegacy = false) {
  return valueParser(value)
    .walk((child) => {
      if (child.type === 'unicode-range') {
        const transformed = unicode(child.value.toLowerCase());

        child.value = isLegacy
          ? transformed.replace(regexLowerCaseUPrefix, 'U')
          : transformed;
      }

      return false;
    })
    .toString();
}

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-normalize-unicode',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = browserslist(opts.overrideBrowserslist, {
        stats: opts.stats || stats,
        path: opts.path || dirname(from || file || __filename),
        env: opts.env || env,
      });

      const cache = new Map();
      const isLegacy = browsers.some(hasLowerCaseUPrefixBug);

      return {
        OnceExit(css) {
          css.walkDecls(/^unicode-range$/i, (decl) => {
            const value = decl.value;

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const newValue = transform(value, isLegacy);

            decl.value = newValue;
            cache.set(value, newValue);
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
