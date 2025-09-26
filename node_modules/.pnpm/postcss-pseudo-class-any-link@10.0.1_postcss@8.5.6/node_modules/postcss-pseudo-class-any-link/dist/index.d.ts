import type { PluginCreator } from 'postcss';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

/** postcss-pseudo-class-any-link plugin options */
export declare type pluginOptions = {
    /** Preserve the original notation. default: true */
    preserve?: boolean;
    /** Add an extra fallback for the "<area>" element in IE and Edge. default: false */
    subFeatures?: {
        areaHrefNeedsFixing?: boolean;
    };
};

export { }
