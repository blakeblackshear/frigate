import type { PluginCreator } from 'postcss';

/** postcss-content-alt-text plugin options */
export declare type basePluginOptions = {
    /** Preserve the original notation. default: true */
    preserve: boolean;
    /** Strip alt text */
    stripAltText: boolean;
};

declare const creator: PluginCreator<pluginOptions>;
export default creator;

/** postcss-content-alt-text plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: true */
    preserve?: boolean;
    /** Strip alt text */
    stripAltText?: boolean;
    /** Enable "@csstools/postcss-progressive-custom-properties". default: true */
    enableProgressiveCustomProperties?: boolean;
};

export { }
