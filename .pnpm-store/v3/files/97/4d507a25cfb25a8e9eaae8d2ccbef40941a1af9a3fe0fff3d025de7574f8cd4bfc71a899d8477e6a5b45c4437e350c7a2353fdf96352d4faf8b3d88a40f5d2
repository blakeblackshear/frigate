/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { GlobalPluginData, GlobalVersion, ActivePlugin, ActiveDocContext, DocVersionSuggestions } from '@docusaurus/plugin-content-docs/client';
import type { UseDataOptions } from '@docusaurus/types';
export declare function getActivePlugin(allPluginData: {
    [pluginId: string]: GlobalPluginData;
}, pathname: string, options?: UseDataOptions): ActivePlugin | undefined;
export declare const getLatestVersion: (data: GlobalPluginData) => GlobalVersion;
export declare function getActiveVersion(data: GlobalPluginData, pathname: string): GlobalVersion | undefined;
export declare function getActiveDocContext(data: GlobalPluginData, pathname: string): ActiveDocContext;
export declare function getDocVersionSuggestions(data: GlobalPluginData, pathname: string): DocVersionSuggestions;
