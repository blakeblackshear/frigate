/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, PluginModule, PluginOptions } from '@docusaurus/types';
type ImportedPluginModule = PluginModule & {
    default?: PluginModule;
};
export type NormalizedPluginConfig = {
    /**
     * The default export of the plugin module, or alternatively, what's provided
     * in the config file as inline plugins. Note that if a file is like:
     *
     * ```ts
     * export default plugin() {...}
     * export validateOptions() {...}
     * ```
     *
     * Then the static methods may not exist here. `pluginModule.module` will
     * always take priority.
     */
    plugin: PluginModule;
    /** Options as they are provided in the config, not validated yet. */
    options: PluginOptions;
    /** Only available when a string is provided in config. */
    pluginModule?: {
        /**
         * Raw module name as provided in the config. Shorthands have been resolved,
         * so at least it's directly `require.resolve`able.
         */
        path: string;
        /** Whatever gets imported with `require`. */
        module: ImportedPluginModule;
    };
    /**
     * Different from `pluginModule.path`, this one is always an absolute path,
     * used to resolve relative paths returned from lifecycles. If it's an inline
     * plugin, it will be path to the config file.
     */
    entryPath: string;
};
/**
 * Reads the site config's `presets`, `themes`, and `plugins`, imports them, and
 * normalizes the return value. Plugin configs are ordered, mostly for theme
 * alias shadowing. Site themes have the highest priority, and preset plugins
 * are the lowest.
 */
export declare function loadPluginConfigs(context: LoadContext): Promise<NormalizedPluginConfig[]>;
export {};
