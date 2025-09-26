/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ContentPaths } from '@docusaurus/utils';
import type { LoadContext } from '@docusaurus/types';
import type { PluginOptions, LoadedContent } from '@docusaurus/plugin-content-pages';
export declare function createPagesContentPaths({ context, options, }: {
    context: LoadContext;
    options: PluginOptions;
}): ContentPaths;
type LoadContentParams = {
    context: LoadContext;
    options: PluginOptions;
    contentPaths: ContentPaths;
};
export declare function loadPagesContent(params: LoadContentParams): Promise<LoadedContent>;
export {};
