import type { OptionValidationContext } from '@docusaurus/types';
export type SVGRConfig = any;
export type SVGOConfig = NonNullable<SVGRConfig['svgoConfig']>;
export type PluginOptions = {
    svgrConfig: SVGRConfig;
};
export type Options = {
    svgrConfig?: Partial<SVGRConfig>;
};
export declare const DEFAULT_OPTIONS: Partial<PluginOptions>;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options | undefined, PluginOptions>): PluginOptions;
