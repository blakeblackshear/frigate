import type { PluginCreator } from 'postcss';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

/** postcss-dir-pseudo-class plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: true */
    preserve?: boolean;
    /** Assume a direction for the document. default: null */
    dir?: 'ltr' | 'rtl';
    /** Assume that the CSS is intended to be used in Shadow DOM with Custom Elements. default: false */
    shadow?: boolean;
};

export { }
