/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type SwizzlePlugin } from './common';
export declare function pluginToThemeName(plugin: SwizzlePlugin): string | undefined;
export declare function getPluginByThemeName(plugins: SwizzlePlugin[], themeName: string): SwizzlePlugin;
export declare function getThemeNames(plugins: SwizzlePlugin[]): string[];
export declare function getThemeName({ themeNameParam, themeNames, list, }: {
    themeNameParam: string | undefined;
    themeNames: string[];
    list: boolean | undefined;
}): Promise<string>;
export declare function getThemePath({ plugins, themeName, typescript, }: {
    plugins: SwizzlePlugin[];
    themeName: string;
    typescript: boolean | undefined;
}): string;
