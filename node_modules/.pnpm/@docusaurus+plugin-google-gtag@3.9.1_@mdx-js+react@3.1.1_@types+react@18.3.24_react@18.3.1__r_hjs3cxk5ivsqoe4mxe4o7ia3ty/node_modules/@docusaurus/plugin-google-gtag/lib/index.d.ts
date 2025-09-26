/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, Plugin } from '@docusaurus/types';
import type { PluginOptions, Options } from './options';
export default function pluginGoogleGtag(context: LoadContext, options: PluginOptions): Plugin | null;
export { validateThemeConfig, validateOptions } from './options';
export type { PluginOptions, Options };
