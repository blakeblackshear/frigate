import type { PluginCreator } from 'postcss';

/** postcss-ic-unit plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: false */
    preserve?: boolean;
    /** Enable "@csstools/postcss-progressive-custom-properties". default: true */
    enableProgressiveCustomProperties?: boolean;
};

declare const postcssPlugin: PluginCreator<pluginOptions>;
export default postcssPlugin;

export { }
