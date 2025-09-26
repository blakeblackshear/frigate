/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { OptionValidationContext } from '@docusaurus/types';
import type { PluginOptions, Options } from '@docusaurus/plugin-content-pages';
export declare const DEFAULT_OPTIONS: PluginOptions;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
