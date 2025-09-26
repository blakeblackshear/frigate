export = pluginCreator;
/**
 * @typedef {Parameters<typeof convert>[2]} ConvertOptions
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{precision?: false | number} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, ConvertOptions, AutoprefixerOptions, BrowserslistOptions, Options };
}
type Options = {
    precision?: false | number;
} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions;
declare var postcss: true;
type ConvertOptions = [number: number, unit: string, {
    time?: boolean | undefined;
    length?: boolean | undefined;
    angle?: boolean | undefined;
}][2];
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
import browserslist = require("browserslist");
//# sourceMappingURL=index.d.ts.map