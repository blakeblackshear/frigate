import type { PluginCreator } from 'postcss';

/** postcss-lab-function plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: false */
    preserve?: boolean;
    /** Enable "@csstools/postcss-progressive-custom-properties". default: true */
    enableProgressiveCustomProperties?: boolean;
    /** Toggle sub features. default: { displayP3: true } */
    subFeatures?: {
        /** Enable displayP3 fallbacks. default: true */
        displayP3?: boolean;
    };
};

/** Transform lab() and lch() functions in CSS. */
declare const postcssPlugin: PluginCreator<pluginOptions>;
export default postcssPlugin;

export { }
