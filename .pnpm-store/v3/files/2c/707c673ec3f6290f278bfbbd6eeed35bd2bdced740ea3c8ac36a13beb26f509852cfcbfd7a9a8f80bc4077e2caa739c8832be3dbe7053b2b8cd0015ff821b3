/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { SwizzleAction, SwizzleActionStatus, SwizzleComponentConfig, SwizzleConfig } from '@docusaurus/types';
export type ThemeComponents = {
    themeName: string;
    all: string[];
    getConfig: (component: string) => SwizzleComponentConfig;
    getDescription: (component: string) => string;
    getActionStatus: (component: string, action: SwizzleAction) => SwizzleActionStatus;
    isSafeAction: (component: string, action: SwizzleAction) => boolean;
    hasAnySafeAction: (component: string) => boolean;
    hasAllSafeAction: (component: string) => boolean;
};
/**
 * Expand a list of components to include and return parent folders.
 * If a folder is not directly a component (no Folder/index.tsx file),
 * we still want to be able to swizzle --eject that folder.
 * See https://github.com/facebook/docusaurus/pull/7175#issuecomment-1103757218
 *
 * @param componentNames the original list of component names
 */
export declare function getMissingIntermediateComponentFolderNames(componentNames: string[]): string[];
export declare function readComponentNames(themePath: string): Promise<string[]>;
export declare function listComponentNames(themeComponents: ThemeComponents): string;
export declare function getThemeComponents({ themeName, themePath, swizzleConfig, }: {
    themeName: string;
    themePath: string;
    swizzleConfig: SwizzleConfig;
}): Promise<ThemeComponents>;
export declare function getComponentName({ componentNameParam, themeComponents, list, }: {
    componentNameParam: string | undefined;
    themeComponents: ThemeComponents;
    list: boolean | undefined;
}): Promise<string>;
