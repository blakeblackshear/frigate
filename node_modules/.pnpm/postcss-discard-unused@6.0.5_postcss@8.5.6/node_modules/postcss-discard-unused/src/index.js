'use strict';
const selectorParser = require('postcss-selector-parser');

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
/**
 * @param {{value: string}} arg
 * @param {(input: string) => string[]} comma
 * @param {(input: string) => string[]} space
 * @return {string[]}
 */
function splitValues({ value }, comma, space) {
  /** @type {string[]} */
  let result = [];
  for (const val of comma(value)) {
    result = result.concat(space(val));
  }
  return result;
}

/**
 * @param {{atRules: import('postcss').AtRule[], values: string[]}} arg
 * @return {void}
 */
function filterAtRule({ atRules, values }) {
  const uniqueValues = new Set(values);
  atRules.forEach((node) => {
    const hasAtRule = uniqueValues.has(node.params);

    if (!hasAtRule) {
      node.remove();
    }
  });
}

/**
 * @param {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} arg
 * @return {void}
 */
function filterNamespace({ atRules, rules }) {
  const uniqueRules = new Set(rules);
  for (const atRule of atRules) {
    const { 0: param, length: len } = atRule.params.split(' ').filter(Boolean);

    if (len === 1) {
      return;
    }

    const hasRule = uniqueRules.has(param) || uniqueRules.has('*');

    if (!hasRule) {
      atRule.remove();
    }
  }
}

/**
 * @param {string} fontFamily
 * @param {string[]} cache
 * @param {(input: string) => string[]} comma
 * @return {boolean}
 */
function hasFont(fontFamily, cache, comma) {
  return comma(fontFamily).some((font) => cache.some((c) => c.includes(font)));
}

/** 
 * fonts have slightly different logic

 * @param {{atRules: import('postcss').AtRule[], values: string[]}} cache
 * @param {(input: string) => string[]} comma
 * @return {void}
 */
function filterFont({ atRules, values }, comma) {
  values = [...new Set(values)];
  for (const r of atRules) {
    if (r.nodes !== undefined) {
      /** @type {import('postcss').Declaration[]} */
      const families = /** @type {import('postcss').Declaration[]} */ (
        r.nodes.filter(
          (node) => node.type === 'decl' && node.prop === 'font-family'
        )
      );

      // Discard the @font-face if it has no font-family
      if (families.length === 0) {
        r.remove();
      }

      for (const family of families) {
        if (!hasFont(family.value.toLowerCase(), values, comma)) {
          r.remove();
        }
      }
    }
  }
}

/**@typedef {{fontFace?: boolean, counterStyle?: boolean, keyframes?: boolean, namespace?: boolean}} Options */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  const { fontFace, counterStyle, keyframes, namespace } = Object.assign(
    {},
    {
      fontFace: true,
      counterStyle: true,
      keyframes: true,
      namespace: true,
    },
    opts
  );

  return {
    postcssPlugin: 'postcss-discard-unused',

    prepare() {
      /** @type {{atRules: import('postcss').AtRule[], values: string[]}} */
      const counterStyleCache = { atRules: [], values: [] };
      /** @type {{atRules: import('postcss').AtRule[], values: string[]}} */
      const keyframesCache = { atRules: [], values: [] };
      /** @type {{atRules: import('postcss').AtRule[], rules: (string | true)[]}} */
      const namespaceCache = { atRules: [], rules: [] };
      /** @type {{atRules: import('postcss').AtRule[], values: string[]}} */
      const fontCache = { atRules: [], values: [] };

      return {
        OnceExit(css, { list }) {
          const { comma, space } = list;
          css.walk((node) => {
            const { type } = node;

            if (type === rule && namespace && node.selector.includes('|')) {
              if (node.selector.includes('[')) {
                // Attribute selector, so we should parse further.
                selectorParser((ast) => {
                  ast.walkAttributes(({ namespace: ns }) => {
                    namespaceCache.rules = namespaceCache.rules.concat(ns);
                  });
                }).process(node.selector);
              } else {
                // Use a simple split function for the namespace
                namespaceCache.rules = namespaceCache.rules.concat(
                  node.selector.split('|')[0]
                );
              }
              return;
            }

            if (type === decl) {
              const { prop } = node;
              if (counterStyle && /list-style|system/.test(prop)) {
                counterStyleCache.values = counterStyleCache.values.concat(
                  splitValues(node, comma, space)
                );
              }

              if (
                fontFace &&
                node.parent !== undefined &&
                node.parent.type === rule &&
                /font(|-family)/.test(prop)
              ) {
                fontCache.values = fontCache.values.concat(
                  comma(node.value.toLowerCase())
                );
              }

              if (keyframes && /animation/.test(prop)) {
                keyframesCache.values = keyframesCache.values.concat(
                  splitValues(node, comma, space)
                );
              }

              return;
            }

            if (type === atrule) {
              const { name } = node;
              if (counterStyle && /counter-style/.test(name)) {
                counterStyleCache.atRules.push(node);
              }

              if (fontFace && name === 'font-face' && node.nodes) {
                fontCache.atRules.push(node);
              }

              if (keyframes && /keyframes/.test(name)) {
                keyframesCache.atRules.push(node);
              }

              if (namespace && name === 'namespace') {
                namespaceCache.atRules.push(node);
              }

              return;
            }
          });

          counterStyle && filterAtRule(counterStyleCache);
          fontFace && filterFont(fontCache, comma);
          keyframes && filterAtRule(keyframesCache);
          namespace && filterNamespace(namespaceCache);
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;
