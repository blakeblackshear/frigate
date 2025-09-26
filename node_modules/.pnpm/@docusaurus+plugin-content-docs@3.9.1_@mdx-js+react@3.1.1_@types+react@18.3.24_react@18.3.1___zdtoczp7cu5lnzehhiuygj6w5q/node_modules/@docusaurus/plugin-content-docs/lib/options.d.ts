/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { OptionValidationContext } from '@docusaurus/types';
import type { PluginOptions, Options } from '@docusaurus/plugin-content-docs';
export declare const DEFAULT_OPTIONS: Omit<PluginOptions, 'id' | 'sidebarPath'>;
export declare function validateOptions({ validate, options: userOptions, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
