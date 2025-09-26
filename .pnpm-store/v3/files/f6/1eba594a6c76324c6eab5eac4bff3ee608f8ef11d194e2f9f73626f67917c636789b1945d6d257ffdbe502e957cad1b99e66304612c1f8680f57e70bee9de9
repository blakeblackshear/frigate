'use strict';
const valueParser = require('postcss-value-parser');
const minifyWeight = require('./lib/minify-weight');
const minifyFamily = require('./lib/minify-family');
const minifyFont = require('./lib/minify-font');

/**
 * @param {string} value
 * @return {boolean}
 */
function hasVariableFunction(value) {
  const lowerCasedValue = value.toLowerCase();

  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

/**
 * @param {string} prop
 * @param {string} value
 * @param {Options} opts
 * @return {string}
 */
function transform(prop, value, opts) {
  let lowerCasedProp = prop.toLowerCase();
  let variableType = '';

  if (typeof opts.removeQuotes === 'function') {
    variableType = opts.removeQuotes(prop);
    opts.removeQuotes = true;
  }
  if ((lowerCasedProp === 'font-weight' || variableType === 'font-weight') && !hasVariableFunction(value)) {
    return minifyWeight(value);
  } else if ((lowerCasedProp === 'font-family'  || variableType === 'font-family') && !hasVariableFunction(value)) {
    const tree = valueParser(value);

    tree.nodes = minifyFamily(tree.nodes, opts);

    return tree.toString();
  } else if (lowerCasedProp === 'font' || variableType === 'font') {
    return minifyFont(value, opts);
  }

  return value;
}

/** @typedef {{removeAfterKeyword?: boolean, removeDuplicates?: boolean, removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight')}} Options */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  opts = Object.assign(
    {},
    {
      removeAfterKeyword: false,
      removeDuplicates: true,
      removeQuotes: true,
    },
    opts
  );

  return {
    postcssPlugin: 'postcss-minify-font-values',
    prepare() {
      const cache = new Map();
      return {
        OnceExit(css) {
          css.walkDecls(/font/i, (decl) => {
            const value = decl.value;

            if (!value) {
              return;
            }

            const prop = decl.prop;

            const cacheKey = `${prop}|${value}`;

            if (cache.has(cacheKey)) {
              decl.value = cache.get(cacheKey);

              return;
            }

            const newValue = transform(prop, value, opts);

            decl.value = newValue;
            cache.set(cacheKey, newValue);
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
