import type { PluginCreator } from 'postcss';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

/** postcss-cascasde-layers plugin options */
export declare type pluginOptions = {
    /** Emit a warning when the "revert" keyword is found in your CSS. default: "warn" */
    onRevertLayerKeyword?: 'warn' | false;
    /** Emit a warning when conditional rules could change the layer order. default: "warn" */
    onConditionalRulesChangingLayerOrder?: 'warn' | false;
    /** Emit a warning when "layer" is used in "@import". default: "warn" */
    onImportLayerRule?: 'warn' | false;
};

export { }
