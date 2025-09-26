export = pluginCreator;
/** @typedef {{startIndex?: number}} Options */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
type Options = {
    startIndex?: number;
};
declare var postcss: true;
//# sourceMappingURL=index.d.ts.map