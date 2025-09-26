import type { PluginCreator } from 'postcss';

/** postcss-color-function plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: false */
    preserve?: boolean;
    /** Enable "@csstools/postcss-progressive-custom-properties". default: true */
    enableProgressiveCustomProperties?: boolean;
};

/** Transform the color() function in CSS. */
declare const postcssPlugin: PluginCreator<pluginOptions>;
export default postcssPlugin;

export { }
