export = defaultPreset;
/**
 * Safe defaults for cssnano which require minimal configuration
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
declare function defaultPreset(opts?: Options & AutoprefixerOptions & BrowserslistOptions): {
    plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][];
};
declare namespace defaultPreset {
    export { SimpleOptions, Options, AutoprefixerOptions, BrowserslistOptions };
}
type Options = {
    cssDeclarationSorter?: SimpleOptions<{
        order?: ("alphabetical" | "concentric-css" | "smacss") | ((propertyNameA: string, propertyNameB: string) => 0 | 1 | -1) | undefined;
        keepOverrides?: boolean | undefined;
    } | undefined> | undefined;
    discardComments?: SimpleOptions<postcssDiscardComments.Options> | undefined;
    reduceInitial?: SimpleOptions<postcssReduceInitial.Options> | undefined;
    minifyGradients?: SimpleOptions<void> | undefined;
    svgo?: SimpleOptions<postcssSvgo.Options> | undefined;
    reduceTransforms?: SimpleOptions<void> | undefined;
    convertValues?: SimpleOptions<postcssConvertValues.Options> | undefined;
    calc?: SimpleOptions<postcssCalc.PostCssCalcOptions> | undefined;
    colormin?: SimpleOptions<postcssColormin.Options> | undefined;
    orderedValues?: SimpleOptions<void> | undefined;
    minifySelectors?: SimpleOptions<void> | undefined;
    minifyParams?: SimpleOptions<postcssMinifyParams.Options> | undefined;
    normalizeCharset?: SimpleOptions<postcssNormalizeCharset.Options> | undefined;
    minifyFontValues?: SimpleOptions<postcssMinifyFontValues.Options> | undefined;
    normalizeUrl?: SimpleOptions<void> | undefined;
    mergeLonghand?: SimpleOptions<void> | undefined;
    discardDuplicates?: SimpleOptions<void> | undefined;
    discardOverridden?: SimpleOptions<void> | undefined;
    normalizeRepeatStyle?: SimpleOptions<void> | undefined;
    mergeRules?: SimpleOptions<postcssMergeRules.Options> | undefined;
    discardEmpty?: SimpleOptions<void> | undefined;
    uniqueSelectors?: SimpleOptions<void> | undefined;
    normalizeString?: SimpleOptions<postcssNormalizeString.Options> | undefined;
    normalizePositions?: SimpleOptions<void> | undefined;
    normalizeWhitespace?: SimpleOptions<void> | undefined;
    normalizeUnicode?: SimpleOptions<postcssNormalizeUnicode.Options> | undefined;
    normalizeDisplayValues?: SimpleOptions<void> | undefined;
    normalizeTimingFunctions?: SimpleOptions<void> | undefined;
    rawCache?: SimpleOptions<void> | undefined;
};
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<import('browserslist').Options, 'stats' | 'path' | 'env'>;
type SimpleOptions<OptionsExtends extends void | object = void> = false | (OptionsExtends & {
    exclude?: true;
});
import postcssDiscardComments = require("postcss-discard-comments");
import postcssReduceInitial = require("postcss-reduce-initial");
import postcssSvgo = require("postcss-svgo");
import postcssConvertValues = require("postcss-convert-values");
import postcssCalc = require("postcss-calc");
import postcssColormin = require("postcss-colormin");
import postcssMinifyParams = require("postcss-minify-params");
import postcssNormalizeCharset = require("postcss-normalize-charset");
import postcssMinifyFontValues = require("postcss-minify-font-values");
import postcssMergeRules = require("postcss-merge-rules");
import postcssNormalizeString = require("postcss-normalize-string");
import postcssNormalizeUnicode = require("postcss-normalize-unicode");
//# sourceMappingURL=index.d.ts.map