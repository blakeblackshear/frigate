/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { NormalizedPluginConfig } from '../../server/plugins/configs';
import type { InitializedPlugin, SwizzleAction, SwizzleActionStatus } from '@docusaurus/types';
export declare const SwizzleActions: SwizzleAction[];
export declare const SwizzleActionsStatuses: SwizzleActionStatus[];
export declare const PartiallySafeHint: string;
export declare function actionStatusLabel(status: SwizzleActionStatus): string;
export declare function actionStatusColor(status: SwizzleActionStatus, str: string): string;
export declare function actionStatusSuffix(status: SwizzleActionStatus, options?: {
    partiallySafe?: boolean;
}): string;
export type SwizzlePlugin = {
    instance: InitializedPlugin;
    plugin: NormalizedPluginConfig;
};
export type SwizzleContext = {
    plugins: SwizzlePlugin[];
};
export type SwizzleCLIOptions = {
    typescript: boolean;
    javascript: boolean;
    danger: boolean;
    list: boolean;
    wrap: boolean;
    eject: boolean;
    config?: string;
};
export declare function normalizeOptions(options: Partial<SwizzleCLIOptions>): SwizzleCLIOptions;
export declare function findStringIgnoringCase(str: string, values: string[]): string | undefined;
export declare function findClosestValue(str: string, values: string[], maxLevenshtein?: number): string | undefined;
