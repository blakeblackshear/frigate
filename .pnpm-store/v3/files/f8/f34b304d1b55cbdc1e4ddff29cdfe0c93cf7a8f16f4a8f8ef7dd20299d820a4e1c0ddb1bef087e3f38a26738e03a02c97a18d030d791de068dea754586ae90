/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type NormalizedPluginConfig } from './configs';
import type { LoadContext, InitializedPlugin } from '@docusaurus/types';
type PluginConfigInitResult = {
    config: NormalizedPluginConfig;
    plugin: InitializedPlugin | null;
};
/**
 * Runs the plugin constructors and returns their return values. It would load
 * plugin configs from `plugins`, `themes`, and `presets`.
 */
export declare function initPluginsConfigs(context: LoadContext, pluginConfigs: NormalizedPluginConfig[]): Promise<PluginConfigInitResult[]>;
/**
 * Runs the plugin constructors and returns their return values
 * for all the site context plugins that do not return null to self-disable.
 */
export declare function initPlugins(context: LoadContext): Promise<InitializedPlugin[]>;
export {};
