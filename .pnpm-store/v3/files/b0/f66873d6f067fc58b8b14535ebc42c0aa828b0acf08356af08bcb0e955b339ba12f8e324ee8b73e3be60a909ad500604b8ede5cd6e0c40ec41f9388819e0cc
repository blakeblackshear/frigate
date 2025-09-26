export = pluginCreator;
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{ignore?: string[]} & AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, AutoprefixerOptions, BrowserslistOptions, Options };
}
type Options = {
    ignore?: string[];
} & AutoprefixerOptions & BrowserslistOptions;
declare var postcss: true;
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
import browserslist = require("browserslist");
//# sourceMappingURL=index.d.ts.map