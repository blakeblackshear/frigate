/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { getCurrentBundler, createJsLoaderFactory } from '@docusaurus/bundler';
import type { Configuration } from 'webpack';
import type { Plugin, ConfigureWebpackUtils, LoadedPlugin } from '@docusaurus/types';
/**
 * Creates convenient utils to inject into the configureWebpack() lifecycle
 * @param config the Docusaurus config
 */
export declare function createConfigureWebpackUtils({ siteConfig, }: {
    siteConfig: Parameters<typeof createJsLoaderFactory>[0]['siteConfig'] & Parameters<typeof getCurrentBundler>[0]['siteConfig'];
}): Promise<ConfigureWebpackUtils>;
/**
 * Helper function to modify webpack config
 * @param configureWebpack a webpack config or a function to modify config
 * @param config initial webpack config
 * @param isServer indicates if this is a server webpack configuration
 * @param utils the <code>ConfigureWebpackUtils</code> utils to inject into the configureWebpack() lifecycle
 * @param content content loaded by the plugin
 * @returns final/ modified webpack config
 */
export declare function applyConfigureWebpack({ configureWebpack, config, isServer, configureWebpackUtils, content, }: {
    configureWebpack: NonNullable<Plugin['configureWebpack']>;
    config: Configuration;
    isServer: boolean;
    configureWebpackUtils: ConfigureWebpackUtils;
    content: unknown;
}): Configuration;
export declare function applyConfigurePostCss(configurePostCss: NonNullable<Plugin['configurePostCss']>, config: Configuration): Configuration;
export declare function executePluginsConfigureWebpack({ plugins, config: configInput, isServer, configureWebpackUtils, }: {
    plugins: LoadedPlugin[];
    config: Configuration;
    isServer: boolean;
    configureWebpackUtils: ConfigureWebpackUtils;
}): Configuration;
