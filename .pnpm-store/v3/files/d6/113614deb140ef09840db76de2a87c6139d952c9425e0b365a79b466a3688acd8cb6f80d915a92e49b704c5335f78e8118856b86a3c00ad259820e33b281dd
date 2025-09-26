'use strict';
const defaultPreset = require('cssnano-preset-default');
const postcssDiscardUnused = require('postcss-discard-unused');
const postcssMergeIdents = require('postcss-merge-idents');
const postcssReduceIdents = require('postcss-reduce-idents');
const postcssZindex = require('postcss-zindex');
const autoprefixer = require('autoprefixer');

/**
 * @template {object | void} [OptionsExtends=void]
 * @typedef {false | OptionsExtends & {exclude?: true}} SimpleOptions
 */

/**
 * @typedef {object} AdvancedOptions
 * @property {autoprefixer.Options} [autoprefixer]
 * @property {SimpleOptions<import('postcss-discard-unused').Options>} [discardUnused]
 * @property {SimpleOptions} [mergeIdents]
 * @property {SimpleOptions<import('postcss-reduce-idents').Options>} [reduceIdents]
 * @property {SimpleOptions<import('postcss-zindex').Options>} [zindex]
 */

/**
 * @typedef {defaultPreset.AutoprefixerOptions} AutoprefixerOptions
 * @typedef {defaultPreset.BrowserslistOptions} BrowserslistOptions
 * @typedef {defaultPreset.Options & AdvancedOptions} Options
 */
/**
 * @param {[import('postcss').PluginCreator<any>, keyof AdvancedOptions][]} plugins
 * @param {Parameters<typeof advancedPreset>[0]} opts
 * @returns {ReturnType<typeof advancedPreset>["plugins"]}
 */
function configurePlugins(plugins, opts = {}) {
  const { overrideBrowserslist, stats, env, path } = opts;

  // Shared Autoprefixer + Browserslist options
  const sharedProps = {
    overrideBrowserslist,
    stats,
    env,
    path,
  };

  /**
   * @type {AdvancedOptions}
   */
  const defaults = {
    autoprefixer: {
      ...sharedProps,
      add: false,

      // Skip unsupported Browserslist "my stats" strings etc
      // https://github.com/browserslist/browserslist/pull/237
      stats:
        typeof sharedProps.stats !== 'string'
          ? sharedProps.stats // Autoprefixer supports stats object only
          : undefined,
    },
  };

  // Merge option properties for each plugin
  return plugins.map(([plugin, opt]) => {
    const defaultProps = defaults[opt] ?? {};
    const presetProps = opts[opt] ?? {};

    return [
      plugin,
      presetProps !== false
        ? { ...defaultProps, ...presetProps }
        : { exclude: true },
    ];
  });
}

/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
function advancedPreset(opts = {}) {
  const { plugins: pluginsDefault } = defaultPreset(opts);

  return {
    plugins: [
      ...pluginsDefault,
      ...configurePlugins(
        [
          [autoprefixer, 'autoprefixer'],
          [postcssDiscardUnused, 'discardUnused'],
          [postcssMergeIdents, 'mergeIdents'],
          [postcssReduceIdents, 'reduceIdents'],
          [postcssZindex, 'zindex'],
        ],
        opts
      ),
    ],
  };
}

module.exports = advancedPreset;
