'use strict';
const { dirname } = require('path');
const browserslist = require('browserslist');
const plugins = require('./plugins');

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{lint?: boolean} & AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'stylehacks',

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

      return {
        OnceExit(css) {
          /** @type {import('./plugin').Plugin[]} */
          const processors = [];
          for (const Plugin of plugins) {
            const hack = new Plugin(result);
            if (!browsers.some((browser) => hack.targets.has(browser))) {
              processors.push(hack);
            }
          }
          css.walk((node) => {
            processors.forEach((proc) => {
              if (!proc.nodeTypes.has(node.type)) {
                return;
              }

              if (opts.lint) {
                return proc.detectAndWarn(node);
              }

              return proc.detectAndResolve(node);
            });
          });
        },
      };
    },
  };
}

/** @type {(node: import('postcss').Node) => boolean} */
pluginCreator.detect = (node) => {
  return plugins.some((Plugin) => {
    const hack = new Plugin();

    return hack.any(node);
  });
};

pluginCreator.postcss = true;
module.exports = pluginCreator;
