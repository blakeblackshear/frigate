import type { PluginCreator } from 'postcss';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

/** postcss-nesting plugin options */
export declare type pluginOptions = {
    /** The implementation edition for CSS Nesting, default to '2024-02' */
    edition?: '2021' | '2024-02';
} & pluginOptions2021 & pluginOptions2024_02;

/** postcss-nesting plugin options */
export declare type pluginOptions2021 = {
    /** Avoid the `:is()` pseudo class as much as possible. default: false */
    noIsPseudoSelector?: boolean;
    /** Silence the `@nest` warning. */
    silenceAtNestWarning?: boolean;
};

/** postcss-nesting plugin options */
export declare type pluginOptions2024_02 = {
    /** @deprecated This option was removed. You must migrate your CSS to the latest speciation to continue using this plugin. */
    noIsPseudoSelector?: boolean;
};

export { }
