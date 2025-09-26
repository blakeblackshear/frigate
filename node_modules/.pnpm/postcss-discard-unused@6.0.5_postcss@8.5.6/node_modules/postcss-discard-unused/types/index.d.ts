export = pluginCreator;
/**@typedef {{fontFace?: boolean, counterStyle?: boolean, keyframes?: boolean, namespace?: boolean}} Options */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
type Options = {
    fontFace?: boolean;
    counterStyle?: boolean;
    keyframes?: boolean;
    namespace?: boolean;
};
declare var postcss: true;
//# sourceMappingURL=index.d.ts.map