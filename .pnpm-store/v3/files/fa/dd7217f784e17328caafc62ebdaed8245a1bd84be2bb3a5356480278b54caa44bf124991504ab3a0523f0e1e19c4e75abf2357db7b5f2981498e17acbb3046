export = pluginCreator;
/**
 * @typedef {object} MinifyColorOptions
 * @property {boolean} [hex]
 * @property {boolean} [alphaHex]
 * @property {boolean} [rgb]
 * @property {boolean} [hsl]
 * @property {boolean} [name]
 * @property {boolean} [transparent]
 */
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {MinifyColorOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} config
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(config?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, MinifyColorOptions, AutoprefixerOptions, BrowserslistOptions, Options };
}
type Options = MinifyColorOptions & AutoprefixerOptions & BrowserslistOptions;
declare var postcss: true;
type MinifyColorOptions = {
    hex?: boolean | undefined;
    alphaHex?: boolean | undefined;
    rgb?: boolean | undefined;
    hsl?: boolean | undefined;
    name?: boolean | undefined;
    transparent?: boolean | undefined;
};
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
import browserslist = require("browserslist");
//# sourceMappingURL=index.d.ts.map