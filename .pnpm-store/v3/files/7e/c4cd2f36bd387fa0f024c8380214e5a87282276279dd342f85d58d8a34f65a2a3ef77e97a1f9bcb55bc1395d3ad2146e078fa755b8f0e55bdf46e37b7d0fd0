import type { OptionValidationContext, ThemeConfig, ThemeConfigValidationContext } from '@docusaurus/types';
export type PluginOptions = {
    trackingID: [string, ...string[]];
    anonymizeIP: boolean;
};
export type Options = {
    trackingID: string | [string, ...string[]];
    anonymizeIP?: boolean;
};
export declare const DEFAULT_OPTIONS: Partial<PluginOptions>;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
export declare function validateThemeConfig({ themeConfig, }: ThemeConfigValidationContext<ThemeConfig>): ThemeConfig;
