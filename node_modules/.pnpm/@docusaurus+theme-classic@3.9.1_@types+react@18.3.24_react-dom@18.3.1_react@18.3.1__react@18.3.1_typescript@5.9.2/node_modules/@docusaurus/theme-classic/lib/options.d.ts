/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Joi } from '@docusaurus/utils-validation';
import type { Options, PluginOptions } from '@docusaurus/theme-classic';
import type { ThemeConfig } from '@docusaurus/theme-common';
import type { ThemeConfigValidationContext, OptionValidationContext } from '@docusaurus/types';
export declare const DEFAULT_CONFIG: ThemeConfig;
export declare const ThemeConfigSchema: Joi.ObjectSchema<ThemeConfig>;
export declare function validateThemeConfig({ validate, themeConfig, }: ThemeConfigValidationContext<ThemeConfig>): ThemeConfig;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
