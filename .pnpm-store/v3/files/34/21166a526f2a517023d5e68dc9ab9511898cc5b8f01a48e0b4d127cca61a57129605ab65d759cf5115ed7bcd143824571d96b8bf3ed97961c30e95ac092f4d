/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { SwizzleAction, SwizzleComponentConfig } from '@docusaurus/types';
import type { SwizzleCLIOptions } from './common';
export declare const SwizzleActions: SwizzleAction[];
export declare function getAction(componentConfig: SwizzleComponentConfig, options: Pick<SwizzleCLIOptions, 'wrap' | 'eject'>): Promise<SwizzleAction>;
export type ActionParams = {
    siteDir: string;
    themePath: string;
    componentName: string;
    typescript: boolean;
};
export type ActionResult = {
    createdFiles: string[];
};
export declare function eject({ siteDir, themePath, componentName, typescript, }: ActionParams): Promise<ActionResult>;
export declare function wrap({ siteDir, themePath, componentName: themeComponentName, typescript, importType, }: ActionParams & {
    importType?: 'original' | 'init';
}): Promise<ActionResult>;
