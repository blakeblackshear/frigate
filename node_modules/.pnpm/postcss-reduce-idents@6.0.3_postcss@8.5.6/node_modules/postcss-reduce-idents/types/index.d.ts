export = pluginCreator;
/** @typedef {{
    counter?: boolean, counterStyle?: boolean,
    keyframes?: boolean, gridTemplate?: boolean,
    encoder?: (value: string, index: number) => string}} Options
*/
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void,
 *    transform: () => void
 *  }} Reducer
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} arg
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator({ counter, counterStyle, keyframes, gridTemplate, encoder, }?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, Options, Reducer };
}
type Options = {
    counter?: boolean | undefined;
    counterStyle?: boolean | undefined;
    keyframes?: boolean | undefined;
    gridTemplate?: boolean | undefined;
    encoder?: ((value: string, index: number) => string) | undefined;
};
declare var postcss: true;
type Reducer = {
    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void;
    transform: () => void;
};
//# sourceMappingURL=index.d.ts.map