import type { OptionValidationContext } from '@docusaurus/types';
export type PluginOptions = {
    id: string;
    layers: Record<string, (filePath: string) => boolean>;
};
export type Options = {
    layers?: PluginOptions['layers'];
};
export declare const DEFAULT_LAYERS: PluginOptions['layers'];
export declare const DEFAULT_OPTIONS: Partial<PluginOptions>;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
