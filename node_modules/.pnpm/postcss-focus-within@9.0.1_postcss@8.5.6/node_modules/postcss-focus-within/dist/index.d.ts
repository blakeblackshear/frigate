import type { PluginCreator } from 'postcss';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

/** postcss-focus-within plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: true */
    preserve?: boolean;
    /** The replacement class to be used in the polyfill. default: "[focus-within]" */
    replaceWith?: string;
    /** Disable the selector prefix that is used to prevent a flash of incorrectly styled content. default: false */
    disablePolyfillReadyClass?: boolean;
};

export { }
